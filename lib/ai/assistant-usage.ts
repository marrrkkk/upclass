/**
 * Assistant-specific usage gating.
 *
 * `checkAssistantBudget` is a pre-flight quota check (no deduction);
 * `recordAssistantTurn` records the turn only after a successful response:
 * 1 credit for the message plus 1 per tool call (batched, capped).
 */
import { checkUsageLimit, recordUsage, type UsageCheckResult } from "@/lib/ai/usage-limiter"

export const MAX_TOOL_CALLS_PER_TURN = 10
export const MAX_STEPS_PER_TURN = 5

export type AssistantBudgetResult = UsageCheckResult

/** Pre-flight budget check for an assistant request. Never deducts. */
export async function checkAssistantBudget(
  userId: string,
  orgId: string,
): Promise<AssistantBudgetResult> {
  return checkUsageLimit(userId, orgId, "assistant_message", { cooldownSeconds: 0 })
}

/**
 * Record a successful assistant turn. Fires both usage events; never throws.
 */
export async function recordAssistantTurn(
  userId: string,
  orgId: string,
  toolCalls: number,
  runId?: string,
): Promise<void> {
  const cappedToolCalls = Math.min(Math.max(0, toolCalls), MAX_TOOL_CALLS_PER_TURN)
  await Promise.allSettled([
    recordUsage(userId, orgId, "assistant_message", 1, runId),
    ...(cappedToolCalls > 0
      ? [recordUsage(userId, orgId, "assistant_tool_call", cappedToolCalls, runId)]
      : []),
  ])
}