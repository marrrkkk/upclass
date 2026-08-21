/**
 * Intent classification: a tiny, cheap, cached classification step.
 *
 * Races a simple-tier model against a 2s timeout (128 output tokens,
 * temperature 0.1). Results are cached for 60s keyed by
 * `sha256(userId:message)`. Any failure falls back to `general_question`.
 */
import { generateWithFallback } from "@/lib/ai/router"
import { cacheGetJson, cacheSet } from "@/lib/ai/cache-layer"
import { sha256Hex } from "@/lib/ai/security/security-events"
import type { AiIntent, AiSensitivity } from "@/lib/ai/types"

export const INTENT_CACHE_TTL_SECONDS = 60
const CLASSIFY_TIMEOUT_MS = 2_000
const CLASSIFY_MAX_OUTPUT_TOKENS = 128

export const INTENT_DESCRIPTIONS: Record<AiIntent, string> = {
  data_query: "the user asks about classes, classwork, quizzes, rosters, schedules, resources, announcements, channels, or any stored classroom data",
  classwork_action: "the user wants to create, assign, or draft classwork or assignments",
  quiz_action: "the user wants to create or draft a quiz",
  analytics: "the user asks about grades, scores, averages, progress, submissions, or performance",
  general_question: "the user asks a general teaching, subject, or workflow question that needs no class data",
  memory_recall: "the user asks about org policies, teaching rules, class context, or stored preferences",
  workflow_guidance: "the user wants to announce something, message a class, or get guidance on a classroom workflow",
}

const INTENT_ORDER: AiIntent[] = [
  "classwork_action",
  "quiz_action",
  "workflow_guidance",
  "memory_recall",
  "analytics",
  "data_query",
  "general_question",
]

function buildClassificationPrompt(message: string): string {
  const lines = INTENT_ORDER.map(
    (intent) => `- ${intent}: ${INTENT_DESCRIPTIONS[intent]}`,
  ).join("\n")

  return `Classify the user message below into exactly one of these intents:

${lines}

Return ONLY a JSON object: {"intent": "<one of the intent names>"}

User message: ${message.slice(0, 1000)}`
}

function parseIntent(text: string): AiIntent | null {
  try {
    const match = text.match(/\{\s*"intent"\s*:\s*"([a-z_]+)"/)
    if (!match) return null
    const candidate = match[1] as AiIntent
    return INTENT_ORDER.includes(candidate) ? candidate : null
  } catch {
    return null
  }
}

export type ClassifyIntentResult = {
  intent: AiIntent
  /** Real token usage when a model call ran (undefined on cache hit/failure). */
  usage?: {
    modelId: string
    provider: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
  }
}

export async function classifyIntent(params: {
  message: string
  userId: string
  timeoutMs?: number
  sensitivity?: AiSensitivity
}): Promise<ClassifyIntentResult> {
  const cacheKey = `intent:${sha256Hex(`${params.userId}:${params.message}`)}`

  const cached = await cacheGetJson<{ intent: AiIntent }>(cacheKey)
  if (cached && cached.intent && INTENT_ORDER.includes(cached.intent)) {
    return { intent: cached.intent }
  }

  const timeoutMs = params.timeoutMs ?? CLASSIFY_TIMEOUT_MS

  try {
    const result = await Promise.race([
      generateWithFallback({
        complexity: "simple",
        sensitivity: params.sensitivity,
        maxOutputTokens: CLASSIFY_MAX_OUTPUT_TOKENS,
        temperature: 0.1,
        timeoutMs,
        messages: [
          {
            role: "system",
            content:
              "You are a routing classifier. You only output a JSON object with an intent field. No prose.",
          },
          { role: "user", content: buildClassificationPrompt(params.message) },
        ],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])

    const intent = result ? parseIntent(result.text) : null
    if (intent && result) {
      await cacheSet(cacheKey, JSON.stringify({ intent }), INTENT_CACHE_TTL_SECONDS)
      return {
        intent,
        usage: {
          modelId: result.modelId,
          provider: result.provider,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
        },
      }
    }
  } catch (error) {
    console.warn("[ai-orchestrator] intent classification failed, defaulting:", error)
  }

  return { intent: "general_question" }
}