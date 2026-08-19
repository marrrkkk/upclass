/**
 * Orchestrator entry: intent → memory → compression → tools → prompt.
 *
 * Everything runs inside the 2.5s pre-stream budget; memory retrieval and
 * conversation compression are skipped once the budget is exhausted.
 *
 * Prompt assembly is split: the STATIC core (modules, tools, user context)
 * comes from the prompt cache keyed by static inputs only; the DYNAMIC
 * context (memories, summary, canary) is appended on every request so
 * edited memories or refreshed summaries can never reuse a stale prompt.
 * The canary token is always built per request and returned.
 */
import type { AiMessageRow } from "@/lib/ai/types"
import type { AiSurface } from "@/lib/ai/types"
import type { AiIntent } from "@/lib/ai/types"
import type { AiSensitivity } from "@/lib/ai/types"
import type { AiResourceContext } from "@/lib/ai/types"
import type { RetrievedMemory } from "@/lib/ai/memory/rag-retriever"
import { classifyIntent } from "./intent-classifier"
import { retrieveConversationMemories } from "./memory-retriever"
import { compressConversation } from "./conversation-compressor"
import { selectToolNames } from "./tool-selector"
import { computeOutputTokens, createBudgetTracker } from "./token-allocation"
import { appendDynamicContext, buildStaticPrompt } from "./prompt-builder"
import { promptCache, promptCacheKey } from "./prompt-cache"
import { logOrchestration } from "./orchestration-logger"
import { logAiInvocation } from "@/lib/ai/token-logger"

export type OrchestrateParams = {
  orgId: string
  orgSlug: string
  orgName: string
  userId: string
  role: "teacher" | "student"
  message: string
  conversationId: string
  intent?: AiIntent
  forceToolNames?: string[]
  surface?: AiSurface
  runId?: string
  /** Provider policy class for the pre-stream model calls. */
  sensitivity?: AiSensitivity
  /** Optional resource context for resource-scoped conversations. */
  resourceContext?: AiResourceContext
}

export type OrchestrateResult = {
  intent: AiIntent
  toolNames: string[]
  outputTokens: number
  memories: RetrievedMemory[]
  usedRag: boolean
  summary: string
  history: AiMessageRow[]
  compressed: boolean
  systemPrompt: string
  promptTokens: number
  canaryToken: string
  stageMs: Record<string, number>
  totalMs: number
  sensitivity: AiSensitivity
}

export async function orchestrate(params: OrchestrateParams): Promise<OrchestrateResult> {
  const tracker = createBudgetTracker()
  const stageMs: Record<string, number> = {}

  const sensitivity = params.sensitivity ?? "org_context"

  const classified = params.intent
    ? { intent: params.intent }
    : await classifyIntent({
        message: params.message,
        userId: params.userId,
        sensitivity,
      })
  const intent = classified.intent
  if (classified.usage) {
    void logAiInvocation({
      runId: params.runId,
      userId: params.userId,
      orgId: params.orgId,
      taskType: "intent_classification",
      model: classified.usage.modelId,
      provider: classified.usage.provider,
      inputTokens: classified.usage.inputTokens,
      outputTokens: classified.usage.outputTokens,
      latencyMs: classified.usage.latencyMs,
    }).catch(() => {})
  }
  stageMs.intent = tracker.stageElapsed()

  let memories: RetrievedMemory[] = []
  let usedRag = false
  if (!tracker.exhausted()) {
    const memoryResult = await retrieveConversationMemories({
      orgId: params.orgId,
      query: params.message,
    })
    memories = memoryResult.memories
    usedRag = memoryResult.usedRag
  }
  stageMs.memory = tracker.stageElapsed()

  let history: AiMessageRow[] = []
  let summary = ""
  let compressed = false
  if (!tracker.exhausted()) {
    const result = await compressConversation(params.conversationId, { sensitivity })
    history = result.recent
    summary = result.summary
    compressed = result.compressed
    if (result.summaryUsage) {
      void logAiInvocation({
        runId: params.runId,
        userId: params.userId,
        orgId: params.orgId,
        taskType: "conversation_summary",
        model: result.summaryUsage.modelId,
        provider: result.summaryUsage.provider,
        inputTokens: result.summaryUsage.inputTokens,
        outputTokens: result.summaryUsage.outputTokens,
        latencyMs: result.summaryUsage.latencyMs,
      }).catch(() => {})
    }
  }
  stageMs.compress = tracker.stageElapsed()

  const toolNames = selectToolNames({
    intent,
    role: params.role,
    forceToolNames: params.forceToolNames,
  })

  const actionToolCount = toolNames.filter((name) =>
    ["draft_announcement", "create_assignment", "draft_quiz", "post_class_message"].includes(name),
  ).length
  const outputTokens = computeOutputTokens(intent, actionToolCount)

  // Static core: cached by static inputs only (no memory count, no summary
  // presence, no message content).
  const cacheKey = promptCacheKey({
    orgId: params.orgId,
    role: params.role,
    intent,
    toolNames,
    orgName: params.orgName,
    surface: params.surface,
  })

  let staticPrompt = promptCache.get(cacheKey)
  if (!staticPrompt) {
    const built = buildStaticPrompt({
      orgId: params.orgId,
      orgName: params.orgName,
      role: params.role,
      intent,
      toolNames,
      surface: params.surface,
    })
    staticPrompt = built.prompt
    promptCache.put(cacheKey, staticPrompt)
  }
  stageMs.prompt = tracker.stageElapsed()

  // Dynamic context: appended per request, never cached. Canary is always
  // rebuilt so leak detection stays active on every turn.
  const { prompt: systemPrompt, canaryToken } = appendDynamicContext(staticPrompt, {
    memories,
    summary,
    orgId: params.orgId,
    resourceContext: params.resourceContext,
  })

  const totalMs = tracker.elapsed()

  logOrchestration({
    intent,
    toolCount: toolNames.length,
    toolNames,
    memoryCount: memories.length,
    usedRag,
    compressed,
    summaryChars: summary.length,
    promptTokens: Math.ceil(systemPrompt.length / 4),
    moduleIds: [],
    stageMs,
    totalMs,
  })

  return {
    intent,
    toolNames,
    outputTokens,
    memories,
    usedRag,
    summary,
    history,
    compressed,
    systemPrompt,
    promptTokens: Math.ceil(systemPrompt.length / 4),
    canaryToken,
    stageMs,
    totalMs,
    sensitivity,
  }
}
