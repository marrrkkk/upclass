import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  toUIMessageStream,
  type Tool,
  type UIMessage,
} from "ai"
import { z } from "zod"

import { db } from "@/db"
import { aiMessages, organizations, resources } from "@/db/schema"
import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import {
  conversationMatchesSurface,
  getAuthorizedAiConversation,
  getOrgRoleForUser,
  resolveAiSurfaceAccess,
} from "@/lib/ai/access"
import {
  failAssistantMessage,
  insertAssistantMessage,
  insertUserMessage,
  updateAssistantMessage,
} from "@/lib/ai/conversations"
import { cacheIncrement } from "@/lib/ai/cache-layer"
import {
  checkAssistantBudget,
  MAX_STEPS_PER_TURN,
  recordAssistantTurn,
} from "@/lib/ai/assistant-usage"
import { sanitizeAiInput } from "@/lib/ai/security/input-sanitizer"
import { filterAiOutput } from "@/lib/ai/security/output-filter"
import { checkDuplicate } from "@/lib/ai/security/request-dedup"
import { getUncertaintyWarning } from "@/lib/ai/security/quality-gate"
import { orchestrate } from "@/lib/ai/orchestrator"
import { streamWithFallback } from "@/lib/ai/router"
import { logAiInvocation } from "@/lib/ai/token-logger"
import { buildReadTools } from "@/lib/ai/tools/read-tools"
import { buildActionTools } from "@/lib/ai/tools/action-tools"
import { parseActionProposals } from "@/lib/ai/tools/action-proposal-schemas"
import { isStructuredCard } from "@/lib/ai/tools/structured-outputs"
import type { AiSourceRef, AiSurface, AiResourceContext } from "@/lib/ai/types"
import { extractResourceText } from "@/lib/resource-text-extraction"
import { createRecommendations } from "@/lib/ai/recommendations"

export const maxDuration = 60

const ASSISTANT_RATE_LIMIT_WINDOW = 60
const ASSISTANT_RATE_LIMIT_MAX = 20
const STREAM_TIMEOUT_MS = 30_000

const assistantBodySchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      parts: z.array(
        z.object({
          type: z.string(),
          text: z.string().optional(),
        }),
      ),
    }),
  ),
  orgSlug: z.string().min(1),
  conversationId: z.string().min(1),
  surface: z.enum(["dashboard", "class", "resource"]),
  entityId: z.string().min(1),
  devModel: z.string().optional().nullable(),
  clientMessageId: z.string().optional().nullable(),
  replyToExisting: z.boolean().optional(),
})

type ParsedUiMessage = {
  id: string
  role: string
  parts: Array<{ type: string; text?: string }>
}

function getLatestUserText(messages: ParsedUiMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== "user") continue
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n")
    if (text.trim()) return text.trim()
  }
  return ""
}

function stripThinkingTags(text: string): string {
  return text
    .replace(/```(?:thinking|reasoning)\s*[\s\S]*?```/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim()
}

async function getLatestUserMessage(conversationId: string): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: aiMessages.id })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
    .limit(1)
  return rows[0] ?? null
}

async function getOrgName(orgId: string): Promise<string> {
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  return org?.name ?? "UpClass"
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = assistantBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request body" },
      { status: 400 },
    )
  }

  const message = getLatestUserText(parsed.data.messages)
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const membership = await getOrganizationMembership(userId, parsed.data.orgSlug)
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const orgId = membership.orgId

  const conversation = await getAuthorizedAiConversation(userId, parsed.data.conversationId)
  if (!conversation || conversation.orgId !== orgId) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }
  if (!conversationMatchesSurface(conversation, parsed.data.surface, parsed.data.entityId)) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  // Correlation id for this turn: usage events, token logs, message
  // metadata, tool events, action confirmations, and feedback all carry it.
  const runId = crypto.randomUUID()

  // Duplicate-request gate (double-submit / network replay protection).
  // Runs after auth so unauthenticated probes never consume budget.
  const dedup = await checkDuplicate(conversation.id, message)
  if (dedup.duplicate) {
    return NextResponse.json(
      { error: "Duplicate request — this message was already processed." },
      { status: 409, headers: { "Cache-Control": "private, no-store" } },
    )
  }

  const rateLimitKey = `ratelimit:assistant:${parsed.data.entityId}:${userId}`
  const rateCount = await cacheIncrement(rateLimitKey, ASSISTANT_RATE_LIMIT_WINDOW)
  if (rateCount > ASSISTANT_RATE_LIMIT_MAX) {
    const failed = await insertAssistantMessage(conversation.id, "")
    await failAssistantMessage(failed.id, {
      errorReason: "rate_limit",
      errorMessage: "Too many assistant requests. Please wait a minute and try again.",
    })
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a minute and try again." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(ASSISTANT_RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(ASSISTANT_RATE_LIMIT_WINDOW),
          "Cache-Control": "private, no-store",
        },
      },
    )
  }

  const budget = await checkAssistantBudget(userId, orgId)
  if (!budget.allowed) {
    const failed = await insertAssistantMessage(conversation.id, "")
    await failAssistantMessage(failed.id, {
      errorReason: "budget_exceeded",
      errorMessage:
        budget.reason === "quota"
          ? "Monthly AI credit limit reached."
          : "Please wait a moment and try again.",
    })
    return NextResponse.json(
      {
        error:
          budget.reason === "quota"
            ? "Monthly AI credit limit reached."
            : "Rate limited. Please wait a moment.",
      },
      { status: 429, headers: { "Cache-Control": "private, no-store" } },
    )
  }

  const sanitized = await sanitizeAiInput(message, { conversationId: conversation.id, userId, orgId })
  if (sanitized.status === "locked") {
    return NextResponse.json(
      { error: "This conversation has been locked after repeated policy violations." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    )
  }
  if (sanitized.status === "rejected") {
    const failed = await insertAssistantMessage(conversation.id, "")
    await failAssistantMessage(failed.id, {
      errorReason: "sanitize_rejected",
      errorMessage: "Your message was rejected. Please rephrase it.",
    })
    return NextResponse.json(
      { error: "Your message was rejected. Please rephrase it." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    )
  }
  const userMessageContent = sanitized.output

  // Persist the user message (clientMessageId dedup; reuse latest on replyToExisting).
  let insertedUserRowId: string | null = null
  const existing = parsed.data.replyToExisting
    ? await getLatestUserMessage(conversation.id)
    : null
  if (!existing) {
    const inserted = await insertUserMessage({
      conversationId: conversation.id,
      content: userMessageContent,
      clientMessageId: parsed.data.clientMessageId ?? undefined,
    })
    if (!inserted) {
      return NextResponse.json({ error: "Duplicate message" }, { status: 409 })
    }
    insertedUserRowId = inserted.id
  }

  const assistantRow = await insertAssistantMessage(conversation.id, "")

  try {
    const orgRole = await getOrgRoleForUser(userId, orgId)
    if (!orgRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const surface = parsed.data.surface as AiSurface
    const surfaceAccess = await resolveAiSurfaceAccess({
      userId,
      orgId,
      surface,
      entityId: parsed.data.entityId,
      orgRole,
    })
    if (!surfaceAccess.allowed) {
      return NextResponse.json(
        { error: "You do not have access to this conversation" },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      )
    }

    // Load resource context if this is a resource surface conversation
    let resourceContext: AiResourceContext | undefined
    if (surface === "resource") {
      const [resource] = await db
        .select({
          id: resources.id,
          title: resources.title,
          description: resources.description,
          category: resources.category,
          fileType: resources.fileType,
          fileName: resources.fileName,
          fileUrl: resources.fileUrl,
          aiSourceText: resources.aiSourceText,
        })
        .from(resources)
        .where(eq(resources.id, parsed.data.entityId))
        .limit(1)

      if (!resource) {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 })
      }

      // Extract or load cached source text
      let sourceText = resource.aiSourceText
      if (!sourceText) {
        try {
          sourceText = await extractResourceText(resource)
          // Persist for future use
          await db
            .update(resources)
            .set({ aiSourceText: sourceText })
            .where(eq(resources.id, resource.id))
            .catch((error: unknown) => {
              console.error("Failed to persist resource source text:", error)
            })
        } catch (error) {
          console.error("Failed to extract resource text:", error)
          // Continue with empty source text rather than failing
          sourceText = ""
        }
      }

      resourceContext = {
        resourceId: resource.id,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        fileType: resource.fileType,
        fileName: resource.fileName,
        sourceText,
      }
    }

    const ctx = {
      orgId,
      orgSlug: parsed.data.orgSlug,
      userId,
      role: surfaceAccess.role,
      runId,
      messageId: assistantRow.id,
      resourceContext,
    }

    const orchestrated = await orchestrate({
      orgId,
      orgSlug: parsed.data.orgSlug,
      orgName: await getOrgName(orgId),
      userId,
      role: surfaceAccess.role,
      message: userMessageContent,
      conversationId: conversation.id,
      surface,
      runId,
      resourceContext,
    })

    const readTools = buildReadTools(ctx) as Record<string, Tool>
    const actionTools = buildActionTools(ctx) as Record<string, Tool>

    const availableTools: Record<string, Tool> = {}
    for (const name of orchestrated.toolNames) {
      const definition = readTools[name] ?? actionTools[name]
      if (definition) availableTools[name] = definition
    }

    let toolCallCount = 0
    const structuredOutputs: unknown[] = []
    const sourceRefs: AiSourceRef[] = []
    const trackedTools: Record<string, Tool> = {}
    for (const [name, definition] of Object.entries(availableTools)) {
      const execute = definition.execute as
        | ((input: unknown, options: unknown) => Promise<unknown>)
        | undefined
      trackedTools[name] = {
        ...definition,
        execute: async (input: unknown, options: unknown) => {
          toolCallCount += 1
          const output = await execute?.(input, options)
          if (output && typeof output === "object" && "structured" in output) {
            const record = (output as { text: string; structured?: unknown }).structured
            if (isStructuredCard(record)) structuredOutputs.push(record)
            const refs = (output as { sourceRefs?: AiSourceRef[] }).sourceRefs
            if (refs) sourceRefs.push(...refs)
            const text = (output as unknown as { text: string }).text
            return typeof text === "string" ? text : output
          }
          return output
        },
      }
    }

    // Build the model-view history. The user message was persisted before
    // orchestration, so `history` already contains it — drop the stored row
    // (inserted this turn, or the reused one on replyToExisting) and append
    // the current (sanitized) message exactly once so the model never sees
    // the user's message twice.
    const duplicateRowId = insertedUserRowId ?? (existing ? existing.id : null)
    const uiMessages: UIMessage[] = orchestrated.history
      .filter((row) => row.id !== duplicateRowId)
      .map((row) => ({
        id: row.id,
        role: row.role === "user" ? "user" : "assistant",
        parts: [{ type: "text" as const, text: row.content }],
      }))
    uiMessages.push({
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text" as const, text: userMessageContent }],
    })

    const devModel =
      process.env.NODE_ENV === "development" && parsed.data.devModel
        ? parsed.data.devModel
        : undefined

    const startedAt = Date.now()
    const needsTools = Object.keys(trackedTools).length > 0

    const { result, modelId, provider, attemptedModels, fallbacks } = await streamWithFallback({
      modelId: devModel,
      needsTools,
      complexity:
        orchestrated.intent === "classwork_action" ||
        orchestrated.intent === "quiz_action" ||
        orchestrated.intent === "analytics"
          ? "complex"
          : "simple",
      sensitivity: orchestrated.sensitivity,
      system: orchestrated.systemPrompt,
      messages: await convertToModelMessages(uiMessages),
      tools: needsTools ? trackedTools : undefined,
      maxOutputTokens: orchestrated.outputTokens,
      temperature: 0.2,
      stopWhen: needsTools ? stepCountIs(MAX_STEPS_PER_TURN) : undefined,
      abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
      onFinish: async ({ text, usage }) => {
        const raw = stripThinkingTags(text ?? "")
        const filtered = await filterAiOutput(raw, {
          canaryToken: orchestrated.canaryToken || undefined,
          userId,
          orgId,
        })

        const actionProposals = parseActionProposals(filtered.output)

        // Generate grounded recommendations based on tool results and structured outputs
        const recommendations = createRecommendations({
          surface,
          entityId: parsed.data.entityId,
          userId,
          orgId,
          role: surfaceAccess.role,
          recentMessages: [
            ...orchestrated.history.slice(-2).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user" as const, content: userMessageContent },
            { role: "assistant" as const, content: filtered.output },
          ],
          toolCalls: Object.keys(trackedTools).map((name) => ({
            name,
            success: true, // We only track successful calls
            hasData: structuredOutputs.length > 0 || filtered.output.length > 100,
          })),
          structuredCards: structuredOutputs.map((card) => ({
            type: typeof card === "object" && card !== null && "type" in card 
              ? String(card.type) 
              : "unknown",
            data: card,
          })),
          availableTools: orchestrated.toolNames,
        })

        // Quality gate (post-sanitization): flag uncertainty despite
        // data-access tools being available. Verdict is surfaced in
        // metadata; no output is discarded for streaming turns.
        const qualityWarning = getUncertaintyWarning(filtered.output, {
          toolsAvailable: needsTools,
        })

        const inputTokens = usage?.inputTokens ?? 0
        const outputTokens = usage?.outputTokens ?? 0

        await updateAssistantMessage(assistantRow.id, {
          content: filtered.output,
          status: "completed",
          provider,
          model: modelId,
          metadata: {
            runId,
            latencyMs: Date.now() - startedAt,
            toolCalls: toolCallCount,
            modelId,
            intent: orchestrated.intent,
            redacted: filtered.redacted || undefined,
            qualityWarning: qualityWarning ?? undefined,
            fallbackAttempts: fallbacks.length,
            actionProposals: actionProposals.length > 0 ? actionProposals : undefined,
            structuredOutputs: structuredOutputs.length > 0 ? structuredOutputs : undefined,
            sourceRefs: sourceRefs.length > 0 ? sourceRefs : undefined,
            recommendations: recommendations.recommendations.length > 0 
              ? recommendations.recommendations 
              : undefined,
          },
        })

        void logAiInvocation({
          runId,
          taskType: "assistant_message",
          userId,
          orgId,
          model: modelId,
          provider,
          inputTokens,
          outputTokens,
          latencyMs: Date.now() - startedAt,
          fallbackAttempts: fallbacks.length,
          attemptedModels,
        }).catch(() => {})

        void recordAssistantTurn(userId, orgId, toolCallCount, runId)
      },
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onError: (error) => {
          if (error == null) return "An error occurred"
          if (typeof error === "string") return error
          if (error instanceof Error) {
            console.error("[ai-assistant] stream error:", error)
            return "The assistant could not generate a response. Please try again."
          }
          return "Something went wrong"
        },
      }),
    })
  } catch (error) {
    console.error("[ai-assistant] request failed:", error)
    await failAssistantMessage(assistantRow.id, {
      errorReason: "provider_failure",
      errorMessage: error instanceof Error ? error.message.slice(0, 300) : "Unexpected error",
    }).catch(() => {})
    return NextResponse.json(
      { error: "Failed to get an AI response" },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    )
  }
}