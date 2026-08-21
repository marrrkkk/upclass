/**
 * Conversation history summarizer.
 *
 * Below the threshold it returns null (no summary needed). Otherwise it races
 * a cheap-tier model summary against a 2s timeout with a heuristic fallback
 * derived from word frequencies, class codes, id-like tokens, names, and dates.
 */
import { generateWithFallback } from "@/lib/ai/router"
import type { AiSensitivity } from "@/lib/ai/types"

export const SUMMARY_THRESHOLD = 10
const SUMMARY_TIMEOUT_MS = 2_000
const SUMMARY_MAX_CHARS = 1_200

export type ConversationSummaryResult = {
  summary: string
  method: "model" | "heuristic"
  messageCount: number
  /** Real token usage when the model call succeeded (undefined otherwise). */
  usage?: {
    modelId: string
    provider: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
  }
}

type SummaryMessage = { role: "user" | "assistant"; content: string }

function truncateMessages(messages: SummaryMessage[]): string {
  let budget = 8_000
  const lines: string[] = []
  for (const message of messages) {
    const content = message.content.slice(0, 600)
    if (budget - content.length < 0) break
    lines.push(`${message.role}: ${content}`)
    budget -= content.length
  }
  return lines.join("\n")
}

const CLASS_CODE_PATTERN = /[A-Z]{2,6}\d{2,6}/g
const DATE_PATTERN = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi
const NAME_PATTERN = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*\b/g

function heuristicSummarize(messages: SummaryMessage[]): string {
  const wordCounts = new Map<string, number>()
  const stopWords = new Set(
    "a an the and or but if of to in on at for with from by about as is are was were be been it its this that these those i you he she we they my your our their me him her us them what which who whom how when where why".split(
      " ",
    ),
  )

  for (const message of messages) {
    const words = message.content.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    for (const word of words) {
      if (word.length < 3 || stopWords.has(word)) continue
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
    }
  }

  const topWords = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word)

  const classCodes = new Set<string>()
  const names = new Set<string>()
  const dates = new Set<string>()

  for (const message of messages) {
    for (const match of message.content.matchAll(CLASS_CODE_PATTERN)) classCodes.add(match[0])
    for (const match of message.content.matchAll(DATE_PATTERN)) dates.add(match[0])
    for (const match of message.content.matchAll(NAME_PATTERN)) {
      if (match[0].length > 2) names.add(match[0])
    }
  }

  const parts: string[] = []
  if (topWords.length > 0) parts.push(`key topics: ${topWords.join(", ")}`)
  if (classCodes.size > 0) parts.push(`class codes: ${[...classCodes].join(", ")}`)
  if (dates.size > 0) parts.push(`dates mentioned: ${[...dates].slice(0, 6).join(", ")}`)
  if (names.size > 0) parts.push(`names mentioned: ${[...names].slice(0, 8).join(", ")}`)

  return parts.join(" | ").slice(0, SUMMARY_MAX_CHARS) || "Conversation covered general questions."
}

export function shouldSummarize(messageCount: number, threshold = SUMMARY_THRESHOLD): boolean {
  const clamped = Math.min(50, Math.max(6, threshold))
  return messageCount >= clamped
}

/**
 * Summarize a conversation. Races a cheap-tier model against 2s; heuristic
 * fallback on timeout or failure.
 */
export async function summarizeConversation(
  messages: SummaryMessage[],
  options: { sensitivity?: AiSensitivity; priorSummary?: string } = {},
): Promise<ConversationSummaryResult> {
  if (messages.length === 0) {
    return { summary: "", method: "heuristic", messageCount: 0 }
  }

  const content = [
    options.priorSummary ? `Existing summary:\n${options.priorSummary.slice(0, SUMMARY_MAX_CHARS)}` : "",
    `New messages:\n${truncateMessages(messages)}`,
  ].filter(Boolean).join("\n\n")
  const system =
    "You summarize classroom assistant conversations. Output ONLY a compact plain-text summary (max 200 words) covering topics, entities, decisions, and unresolved items. No labels, no markdown."

  try {
    const result = await Promise.race([
      generateWithFallback({
        complexity: "simple",
        sensitivity: options.sensitivity,
        maxOutputTokens: 256,
        temperature: 0.3,
        timeoutMs: SUMMARY_TIMEOUT_MS,
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SUMMARY_TIMEOUT_MS)),
    ])

    if (result && result.text.trim()) {
      return {
        summary: result.text.trim().slice(0, SUMMARY_MAX_CHARS),
        method: "model",
        messageCount: messages.length,
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
    console.warn("[ai-summarizer] model summary failed, using heuristic:", error)
  }

  return {
    summary: heuristicSummarize(messages),
    method: "heuristic",
    messageCount: messages.length,
  }
}
