/**
 * Token allocation + orchestration budget.
 *
 * The route enforces the 2.5s pre-stream orchestration budget; this module
 * owns the output-token budget per intent, with a bonus per tool call.
 */
import type { AiIntent } from "@/lib/ai/types"

export const ORCHESTRATION_BUDGET_MS = 2_500

export const INTENT_OUTPUT_TOKENS: Record<AiIntent, number> = {
  data_query: 800,
  general_question: 800,
  classwork_action: 2_200,
  quiz_action: 2_200,
  analytics: 1_400,
  workflow_guidance: 1_400,
  memory_recall: 1_400,
}

export const TOOL_CALL_OUTPUT_BONUS = 150
export const TOOL_CALL_OUTPUT_BONUS_CAP = 1_500

export function computeOutputTokens(intent: AiIntent, toolCallCount = 0): number {
  const base = INTENT_OUTPUT_TOKENS[intent] ?? 800
  const bonus = Math.min(toolCallCount * TOOL_CALL_OUTPUT_BONUS, TOOL_CALL_OUTPUT_BONUS_CAP)
  return base + bonus
}

/** Tracks elapsed stage time against the orchestration budget. */
export function createBudgetTracker() {
  const startedAt = Date.now()
  let lastStageAt = startedAt

  return {
    /** Elapsed ms since tracker creation. */
    elapsed(): number {
      return Date.now() - startedAt
    },
    /** ms since the previous stage check. */
    stageElapsed(): number {
      const now = Date.now()
      const elapsed = now - lastStageAt
      lastStageAt = now
      return elapsed
    },
    /** True once the orchestration budget has been consumed. */
    exhausted(): boolean {
      return Date.now() - startedAt >= ORCHESTRATION_BUDGET_MS
    },
  }
}