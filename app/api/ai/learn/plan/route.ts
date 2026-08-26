import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, gte, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import {
  classMembership,
  classwork,
  classes,
  studyCards,
  studyCollections,
  studySessions,
} from "@/db/schema"
import { auth } from "@/lib/auth"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"
import { cacheGet, cacheSet } from "@/lib/ai/cache-layer"
import { isStudyPlanEnabled } from "@/lib/ai/policy"
import { generateWithFallback } from "@/lib/ai/router"
import { buildStudyPlanPrompt, studyPlanSchema, type StudyPlanFacts } from "@/lib/ai/study-plan"
import { logAiInvocation } from "@/lib/ai/token-logger"
import { getOrganizationMembership } from "@/lib/org-validation"

const CACHE_TTL_SECONDS = 12 * 3_600

async function collectFacts(userId: string, orgId: string): Promise<StudyPlanFacts> {
  const now = Date.now()
  const in7Days = new Date(now + 7 * 86_400_000)
  const since14Days = new Date(now - 14 * 86_400_000)

  const spaceRows = await db
    .select({
      id: studyCollections.id,
      title: studyCollections.title,
      totalCards: sql<number>`count(distinct ${studyCards.id})`,
      dueNext7Days: sql<number>`count(distinct case when ${studyCards.dueAt} <= ${in7Days.toISOString()} then ${studyCards.id} end)`,
    })
    .from(studyCollections)
    .leftJoin(studyCards, eq(studyCards.collectionId, studyCollections.id))
    .where(and(eq(studyCollections.orgId, orgId), eq(studyCollections.studentId, userId), eq(studyCollections.archived, false)))
    .groupBy(studyCollections.id)

  const sessionRows = await db
    .select({
      collectionId: studySessions.collectionId,
      correct: sql<number>`sum(${studySessions.correct})`,
      total: sql<number>`sum(${studySessions.total})`,
    })
    .from(studySessions)
    .where(and(eq(studySessions.studentId, userId), gte(studySessions.createdAt, since14Days)))
    .groupBy(studySessions.collectionId)

  const accuracyByCollection = new Map(
    sessionRows.map((row) => {
      const total = Number(row.total ?? 0)
      return [row.collectionId, total > 0 ? Number(row.correct ?? 0) / total : null]
    }),
  )

  const classIds = (
    await db
      .select({ classId: classMembership.classId })
      .from(classMembership)
      .where(eq(classMembership.userId, userId))
  ).map((row) => row.classId)

  const deadlineRows =
    classIds.length > 0
      ? await db
          .select({ title: classwork.title, className: classes.title, dueDate: classwork.dueDate })
          .from(classwork)
          .innerJoin(classes, eq(classwork.classId, classes.id))
          .where(and(eq(classes.orgId, orgId), sql`${classwork.dueDate} between now() and now() + interval '14 days'`))
          .limit(10)
      : []

  return {
    firstName: "",
    spaces: spaceRows.map((row) => ({
      title: row.title,
      totalCards: Number(row.totalCards ?? 0),
      dueNext7Days: Number(row.dueNext7Days ?? 0),
      accuracy14d: accuracyByCollection.get(row.id) ?? null,
    })),
    deadlines: deadlineRows.map((row) => ({
      title: row.title,
      className: row.className,
      dueInDays: Math.max(0, Math.ceil(((row.dueDate?.getTime() ?? now) - now) / 86_400_000)),
    })),
  }
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isStudyPlanEnabled()) {
    return NextResponse.json({ error: "Study plans are currently disabled" }, { status: 403 })
  }

  const parsedBody = z.object({ orgSlug: z.string().min(1) }).safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const membership = await getOrganizationMembership(session.user.id, parsedBody.data.orgSlug)
  if (!membership) return NextResponse.json({ error: "Organization access required" }, { status: 403 })

  const limit = await enforceAIRateLimit(session.user.id, "plan")
  if (!limit.allowed) {
    return NextResponse.json({ error: `You've reached the daily plan limit (${limit.dailyLimit}).` }, { status: 429 })
  }

  const cacheKey = `ai:plan:v1:${session.user.id}:${new Date().toISOString().slice(0, 10)}`
  try {
    const cached = await cacheGet(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))
  } catch {
    // Regenerate on cache trouble.
  }

  let facts: StudyPlanFacts
  try {
    facts = await collectFacts(session.user.id, membership.orgId)
  } catch (error) {
    console.warn("[study-plan] facts failed", error)
    return NextResponse.json({ error: "Could not load your study data." }, { status: 500 })
  }
  facts.firstName = (session.user.name ?? "there").split(" ")[0] || "there"

  const runId = crypto.randomUUID()
  const startedAt = Date.now()
  try {
    const result = await generateWithFallback({
      complexity: "simple",
      sensitivity: "student_linked",
      maxOutputTokens: 900,
      temperature: 0.4,
      messages: [
        { role: "system", content: "You are a study coach. Plans must be realistic and concrete. Return valid JSON only." },
        { role: "user", content: buildStudyPlanPrompt(facts) },
      ],
    })

    const plan = studyPlanSchema.parse(
      JSON.parse(result.text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || result.text),
    )

    void logAiInvocation({
      runId,
      taskType: "study_plan",
      userId: session.user.id,
      orgId: membership.orgId,
      model: result.modelId,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    }).catch(() => {})

    await cacheSet(cacheKey, JSON.stringify(plan), CACHE_TTL_SECONDS).catch(() => {})
    return NextResponse.json(plan)
  } catch (error) {
    void logAiInvocation({
      runId,
      taskType: "study_plan",
      userId: session.user.id,
      orgId: membership.orgId,
      status: "error",
      errorMessage: error instanceof Error ? error.message.slice(0, 300) : "AI service error",
      latencyMs: Date.now() - startedAt,
    }).catch(() => {})
    console.warn("[study-plan] generation failed", error)
    return NextResponse.json({ error: "The plan could not be generated right now." }, { status: 502 })
  }
}
