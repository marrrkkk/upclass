import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { activityLog, classes, classMembership, classwork, orgMembership, submissions, user } from "@/db/schema"
import { auth } from "@/lib/auth"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"
import { isOutreachEnabled } from "@/lib/ai/policy"
import { generateWithFallback } from "@/lib/ai/router"
import { logAiInvocation } from "@/lib/ai/token-logger"

const responseSchema = z.object({
  message: z.string().min(20).max(1_200),
})

/**
 * At-risk outreach draft: a short, friendly check-in message a teacher can
 * send a student who has gone quiet. Draft-only — sending stays with the
 * teacher.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isOutreachEnabled()) {
    return NextResponse.json({ error: "Outreach drafts are currently disabled" }, { status: 403 })
  }

  const parsed = z
    .object({ studentId: z.string().uuid(), classId: z.string().uuid() })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  const requesterId = session.user.id

  // The requester must teach this class or administer the org.
  const [classRow] = await db
    .select({ id: classes.id, title: classes.title, ownerId: classes.ownerId, orgId: classes.orgId })
    .from(classes)
    .where(eq(classes.id, parsed.data.classId))
    .limit(1)
  if (!classRow) return NextResponse.json({ error: "Class not found" }, { status: 404 })

  let authorized = classRow.ownerId === requesterId
  if (!authorized) {
    const [teacherRole] = await db
      .select({ role: classMembership.role })
      .from(classMembership)
      .where(and(eq(classMembership.classId, classRow.id), eq(classMembership.userId, requesterId)))
      .limit(1)
    authorized = teacherRole?.role === "teacher"
  }
  if (!authorized) {
    const [adminRole] = await db
      .select({ role: orgMembership.role })
      .from(orgMembership)
      .where(and(eq(orgMembership.orgId, classRow.orgId), eq(orgMembership.userId, requesterId)))
      .limit(1)
    authorized = adminRole?.role === "owner" || adminRole?.role === "admin"
  }
  if (!authorized) return NextResponse.json({ error: "Only teachers can draft outreach" }, { status: 403 })

  const limit = await enforceAIRateLimit(requesterId, "outreach")
  if (!limit.allowed) {
    return NextResponse.json({ error: `You've reached the daily limit (${limit.dailyLimit}).` }, { status: 429 })
  }

  const [[student], activityRows, submissionStats] = await Promise.all([
    db.select({ name: user.name }).from(user).where(eq(user.id, parsed.data.studentId)).limit(1),
    db
      .select({ lastActivity: sql<string | null>`max(${activityLog.occurredAt})` })
      .from(activityLog)
      .where(and(eq(activityLog.actorId, parsed.data.studentId), eq(activityLog.classId, classRow.id))),
    db
      .select({
        total: sql<number>`count(*)`,
        submitted: sql<number>`count(*) filter (where ${submissions.status} in ('submitted','graded'))`,
        missing: sql<number>`count(*) filter (where ${submissions.status} = 'pending')`,
      })
      .from(submissions)
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .where(and(eq(classwork.classId, classRow.id), eq(submissions.studentId, parsed.data.studentId))),
  ])
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

  const lastActivity = activityRows[0]?.lastActivity ? new Date(activityRows[0].lastActivity) : null
  const daysQuiet = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / 86_400_000) : null
  const stats = submissionStats[0] ?? { total: 0, submitted: 0, missing: 0 }

  function buildPrompt() {
    return `Draft a warm, brief check-in message from a teacher to ${student.name} in "${classRow.title}". Facts are trusted context. Reference their situation gently (no blame), offer help, and end with one small concrete next step. Under 90 words, second person, plain text.
- Days since last activity in class: ${daysQuiet === null ? "no recorded activity" : daysQuiet}
- Work in this class: ${stats.submitted} of ${stats.total} submitted${Number(stats.missing) > 0 ? `, ${stats.missing} not started` : ""}`
  }

  const runId = crypto.randomUUID()
  const startedAt = Date.now()
  try {
    const result = await generateWithFallback({
      complexity: "simple",
      sensitivity: "highly_sensitive",
      maxOutputTokens: 400,
      temperature: 0.5,
      messages: [
        { role: "system", content: "You write kind, specific teacher outreach messages. Return valid JSON only: {\"message\":\"...\"}" },
        { role: "user", content: buildPrompt() },
      ],
    })

    const message = responseSchema.parse(
      JSON.parse(result.text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || result.text),
    ).message

    void logAiInvocation({
      runId,
      taskType: "outreach_draft",
      userId: requesterId,
      orgId: classRow.orgId,
      model: result.modelId,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    }).catch(() => {})

    return NextResponse.json({ message })
  } catch (error) {
    void logAiInvocation({
      runId,
      taskType: "outreach_draft",
      userId: requesterId,
      orgId: classRow.orgId,
      status: "error",
      errorMessage: error instanceof Error ? error.message.slice(0, 300) : "AI service error",
      latencyMs: Date.now() - startedAt,
    }).catch(() => {})
    console.warn("[outreach-draft] failed", error)
    return NextResponse.json({ error: "A draft could not be generated right now." }, { status: 502 })
  }
}
