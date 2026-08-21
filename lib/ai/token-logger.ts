/**
 * Token/cost logging for AI invocations.
 *
 * Costs are computed from `TOKEN_COST_TABLE` (cents per million tokens).
 * Models absent from the table are logged with `unpriced: true`. Each call
 * also emits one JSON console line for observability.
 */
import { db } from "@/db"
import { aiTokenLogs, aiToolEvents } from "@/db/schema"

/** Retention window (days) and batch size for the token-log cleanup cron. */
export const TOKEN_LOG_RETENTION_DAYS = 90
export const TOKEN_LOG_BATCH_SIZE = 1_000

export const TOKEN_COST_TABLE: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  "cerebras:gpt-oss-120b": { inputPerMillion: 0, outputPerMillion: 0 },
  "cerebras:gpt-oss-20b": { inputPerMillion: 0, outputPerMillion: 0 },
  "groq:llama-3.3-70b-versatile": { inputPerMillion: 0, outputPerMillion: 0 },
  "groq:llama-3.1-8b-instant": { inputPerMillion: 0, outputPerMillion: 0 },
  "google:gemini-2.5-flash": { inputPerMillion: 0, outputPerMillion: 0 },
  "google:gemini-2.5-flash-lite": { inputPerMillion: 0, outputPerMillion: 0 },
  "mistral:open-mistral-nemo": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:meta-llama/llama-3.3-70b-instruct:free": { inputPerMillion: 0, outputPerMillion: 0 },
}

export type LogAiInvocationInput = {
  runId?: string
  userId: string
  orgId: string
  taskType: string
  model?: string | null
  provider?: string | null
  inputTokens?: number
  outputTokens?: number
  cacheHit?: boolean
  latencyMs?: number
  status?: "success" | "error"
  errorMessage?: string | null
  fallbackAttempts?: number
  attemptedModels?: string[]
}

export function estimateCostCents(
  modelId: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
): { costCents: number; unpriced: boolean } {
  const price = modelId ? TOKEN_COST_TABLE[modelId] : undefined
  if (!price) return { costCents: 0, unpriced: true }

  const inputCost = (inputTokens / 1_000_000) * price.inputPerMillion
  const outputCost = (outputTokens / 1_000_000) * price.outputPerMillion
  return { costCents: Math.round(inputCost + outputCost), unpriced: false }
}

/** Insert an invocation row and emit a JSON console line. Never throws. */
export async function logAiInvocation(input: LogAiInvocationInput): Promise<void> {
  const inputTokens = Math.max(0, input.inputTokens ?? 0)
  const outputTokens = Math.max(0, input.outputTokens ?? 0)
  const totalTokens = inputTokens + outputTokens
  const { costCents, unpriced } = estimateCostCents(input.model, inputTokens, outputTokens)

  console.log(
    JSON.stringify({
      type: "ai_invocation",
      runId: input.runId ?? null,
      taskType: input.taskType,
      model: input.model,
      provider: input.provider,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostCents: costCents,
      unpriced,
      cacheHit: input.cacheHit ?? false,
      latencyMs: input.latencyMs ?? null,
      status: input.status ?? "success",
      fallbackAttempts: input.fallbackAttempts ?? 0,
    }),
  )

  try {
    await db.insert(aiTokenLogs).values({
      id: crypto.randomUUID(),
      runId: input.runId ?? null,
      userId: input.userId,
      orgId: input.orgId,
      taskType: input.taskType,
      model: input.model ?? null,
      provider: input.provider ?? null,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostCents: costCents,
      cacheHit: input.cacheHit ?? false,
      latencyMs: input.latencyMs ?? null,
      status: input.status ?? "success",
      errorMessage: input.errorMessage ? input.errorMessage.slice(0, 1024) : null,
      unpriced,
    })
  } catch (error) {
    console.error("[ai-token-log] failed to persist invocation log:", error)
  }
}

export type LogToolEventInput = {
  runId?: string
  messageId?: string
  userId: string
  orgId: string
  toolName: string
  success?: boolean
  emptyResult?: boolean
  latencyMs?: number
}

/**
 * Record one tool-call execution for the tool-quality evaluation loop
 * (invocation frequency, success rate, empty-result rate, latency). Never
 * throws. Logs only hashes/ids — never tool payloads or student content.
 */
export async function logToolEvent(input: LogToolEventInput): Promise<void> {
  try {
    await db.insert(aiToolEvents).values({
      id: crypto.randomUUID(),
      runId: input.runId ?? null,
      messageId: input.messageId ?? null,
      userId: input.userId,
      orgId: input.orgId,
      toolName: input.toolName,
      success: input.success ?? true,
      emptyResult: input.emptyResult ?? false,
      latencyMs: input.latencyMs ?? null,
    })
  } catch (error) {
    console.error("[ai-tool-event] failed to persist tool event:", error)
  }
}