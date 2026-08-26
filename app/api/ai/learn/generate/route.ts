import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { resources, studyCollections, studySources } from "@/db/schema"
import { auth } from "@/lib/auth"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"
import { isLearnGenerationEnabled } from "@/lib/ai/policy"
import {
  buildLearnSourceContext,
  generateStudyMaterial,
  LEARN_MODES,
} from "@/lib/ai/learn-generation"
import { resolveResourceAccess } from "@/lib/ai/access"
import { extractResourceText } from "@/lib/resource-text-extraction"
import { getOrganizationMembership } from "@/lib/org-validation"

const requestSchema = z.object({
  orgSlug: z.string().min(1),
  source: z.discriminatedUnion("type", [
    z.object({ type: z.literal("resource"), resourceId: z.string().min(1) }),
    z.object({ type: z.literal("study_source"), sourceId: z.string().min(1) }),
    z.object({ type: z.literal("notes"), text: z.string().trim().min(20).max(60_000) }),
  ]),
  mode: z.enum(LEARN_MODES),
  topic: z.string().trim().max(200).optional(),
  itemCount: z.number().int().min(3).max(20).default(10),
  difficulty: z.enum(["foundational", "standard", "challenging"]).default("standard"),
  instructions: z.string().trim().max(500).optional(),
})

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isLearnGenerationEnabled()) {
    return NextResponse.json({ error: "Study generation is currently disabled" }, { status: 403 })
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 })
  const membership = await getOrganizationMembership(session.user.id, parsed.data.orgSlug)
  if (!membership) return NextResponse.json({ error: "Organization access required" }, { status: 403 })
  const limit = await enforceAIRateLimit(session.user.id, "learn")
  if (!limit.allowed) return NextResponse.json({ error: `You've reached the daily AI study limit (${limit.dailyLimit}).` }, { status: 429 })

  try {
    let context
    if (parsed.data.source.type === "notes") {
      context = await buildLearnSourceContext({ source: { type: "notes", text: parsed.data.source.text }, topic: parsed.data.topic || "" })
    } else if (parsed.data.source.type === "resource") {
      const [resource] = await db.select().from(resources).where(eq(resources.id, parsed.data.source.resourceId)).limit(1)
      if (!resource || resource.orgId !== membership.orgId || !(await resolveResourceAccess(session.user.id, resource))) {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 })
      }
      let text = resource.aiSourceText
      if (!text) {
        text = await extractResourceText(resource)
        await db.update(resources).set({ aiSourceText: text }).where(eq(resources.id, resource.id))
      }
      context = await buildLearnSourceContext({
        orgId: resource.orgId,
        source: { type: "resource", resourceId: resource.id, text },
        topic: parsed.data.topic || "",
      })
    } else {
      // Study sources must belong to one of the caller's own collections.
      const [row] = await db
        .select({ source: studySources, orgId: studyCollections.orgId })
        .from(studySources)
        .innerJoin(studyCollections, eq(studySources.collectionId, studyCollections.id))
        .where(and(eq(studySources.id, parsed.data.source.sourceId), eq(studyCollections.studentId, session.user.id)))
        .limit(1)
      if (!row) return NextResponse.json({ error: "Source not found" }, { status: 404 })

      if (row.source.resourceId && !row.source.aiSourceText) {
        const [resource] = await db.select().from(resources).where(eq(resources.id, row.source.resourceId)).limit(1)
        if (!resource || !(await resolveResourceAccess(session.user.id, resource))) {
          return NextResponse.json({ error: "Source not found" }, { status: 404 })
        }
        context = await buildLearnSourceContext({
          orgId: row.orgId,
          source: { type: "resource", resourceId: resource.id, text: resource.aiSourceText },
          topic: parsed.data.topic || "",
        })
      } else {
        context = await buildLearnSourceContext({
          source: { type: "notes", text: row.source.aiSourceText ?? "" },
          topic: parsed.data.topic || "",
        })
      }
    }

    const result = await generateStudyMaterial({
      mode: parsed.data.mode,
      count: parsed.data.itemCount,
      difficulty: parsed.data.difficulty,
      topic: parsed.data.topic || "",
      instructions: parsed.data.instructions,
      context,
    })

    return NextResponse.json(
      result.kind === "cards"
        ? { cards: result.cards, modelId: result.modelId, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens } }
        : { questions: result.questions, modelId: result.modelId, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens } },
    )
  } catch (error) {
    console.error("Learn generation failed", error)
    return NextResponse.json({ error: "The study draft could not be generated. Try a smaller topic or different source." }, { status: 502 })
  }
}
