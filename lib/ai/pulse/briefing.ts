/**
 * Daily Class Pulse — briefing generation.
 *
 * Turns the facts snapshot into a short, actionable daily briefing. The
 * model only ever sees the aggregated facts (never student PII) and is
 * instructed to stay strictly within them. The briefing call is treated as
 * `student_linked` sensitivity: it must never leak across classes and is
 * limited to the approved model set with no free-tier fallback.
 */
import { generateWithFallback } from "@/lib/ai/router"
import { logAiInvocation } from "@/lib/ai/token-logger"
import { isPulseEnabled } from "@/lib/ai/policy"
import type { PulseFacts } from "./facts"

export const PULSE_BRIEFING_MAX_TOKENS = 320
export const PULSE_BRIEFING_TIMEOUT_MS = 12_000

export type PulseBriefingResult = {
  briefing: string
  modelId: string
  provider: string
  usage?: {
    inputTokens: number
    outputTokens: number
    latencyMs: number
  }
}

export function factsToPrompt(facts: PulseFacts): string {
  const lines = facts.facts.map(
    (fact) => `- ${fact.label}: ${fact.value}${fact.detail ? ` (${fact.detail})` : ""}`,
  )
  const deadlineLine = facts.nearestDeadline
    ? `\nNearest deadline: "${facts.nearestDeadline.title}" in ${facts.nearestDeadline.className}, due ${new Date(facts.nearestDeadline.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}.`
    : ""
  return `Today's classroom signals (${facts.role === "teacher" ? "teacher" : "student"} view):\n${lines.join("\n")}${deadlineLine}`
}

const BRIEFING_SYSTEM =
  "You write the daily Class Pulse briefing for UpClass. Output ONE compact paragraph of 60-110 words in plain text: lead with the single most important signal, then the next 2-3 priorities, then one concrete suggested next action. Only reference the facts provided — never invent numbers, names, or work. No markdown, no lists, no labels."

/**
 * Generate a daily pulse briefing from aggregated facts. Returns null when
 * the feature is disabled by the kill switch or the model call fails.
 */
export async function generatePulseBriefing(params: {
  userId: string
  orgId: string
  role: "teacher" | "student"
  facts: PulseFacts
  runId: string
}): Promise<PulseBriefingResult | null> {
  if (!isPulseEnabled()) return null

  try {
    const result = await Promise.race([
      generateWithFallback({
        complexity: "simple",
        sensitivity: "student_linked",
        maxOutputTokens: PULSE_BRIEFING_MAX_TOKENS,
        temperature: 0.4,
        timeoutMs: PULSE_BRIEFING_TIMEOUT_MS,
        messages: [
          { role: "system", content: BRIEFING_SYSTEM },
          { role: "user", content: factsToPrompt(params.facts) },
        ],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PULSE_BRIEFING_TIMEOUT_MS)),
    ])

    if (!result || !result.text.trim()) return null

    void logAiInvocation({
      runId: params.runId,
      taskType: "pulse_briefing",
      userId: params.userId,
      orgId: params.orgId,
      model: result.modelId,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    }).catch(() => {})

    return {
      briefing: result.text.trim().slice(0, 1_200),
      modelId: result.modelId,
      provider: result.provider,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      },
    }
  } catch (error) {
    console.warn("[ai-pulse] briefing generation failed:", error)
    return null
  }
}