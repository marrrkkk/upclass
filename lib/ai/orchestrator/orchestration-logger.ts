/**
 * Orchestration logger: structured, one-line logs per orchestrated turn.
 */
export type OrchestrationLogEntry = {
  intent: string
  toolCount: number
  toolNames: string[]
  memoryCount: number
  usedRag: boolean
  compressed: boolean
  summaryChars: number
  promptTokens: number
  moduleIds: string[]
  stageMs: Record<string, number>
  totalMs: number
}

export function logOrchestration(entry: OrchestrationLogEntry): void {
  console.log(
    JSON.stringify({
      type: "ai.orchestration",
      ...entry,
    }),
  )
}

export function logOrchestrationError(context: string, error: unknown): void {
  console.error(
    JSON.stringify({
      type: "ai.orchestration.error",
      context,
      error: error instanceof Error ? error.message : String(error),
    }),
  )
}