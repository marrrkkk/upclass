/**
 * Conversation compressor: stored summary + recent window.
 *
 * - Loads the persisted summary (if any).
 * - If the completed-message count crosses the threshold, refreshes the
 *   summary with the cheap summarizer and persists it, then returns the
 *   summary plus the last `window` messages.
 * - Otherwise returns the last 20 messages unchanged.
 */
import {
  getConversationSummary,
  getRecentMessages,
  upsertConversationSummary,
} from "@/lib/ai/conversations"
import {
  shouldSummarize,
  summarizeConversation,
  type ConversationSummaryResult,
} from "@/lib/ai/history-summarizer"
import type { AiMessageRow, AiSensitivity } from "@/lib/ai/types"

export const COMPRESS_WINDOW = 6
export const COMPRESS_HISTORY_LIMIT = 20

export type CompressedHistory = {
  summary: string
  recent: AiMessageRow[]
  compressed: boolean
  messageCount: number
  /** Real token usage from the summary model call (when one ran). */
  summaryUsage?: ConversationSummaryResult["usage"]
}

function toSummaryMessages(messages: AiMessageRow[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  }))
}

export async function compressConversation(
  conversationId: string,
  options: { sensitivity?: AiSensitivity } = {},
): Promise<CompressedHistory> {
  const stored = await getConversationSummary(conversationId)
  const recent = await getRecentMessages(conversationId, COMPRESS_HISTORY_LIMIT)

  if (recent.length === 0) {
    return { summary: stored?.summary ?? "", recent: [], compressed: false, messageCount: 0 }
  }

  if (shouldSummarize(recent.length)) {
    const result = await summarizeConversation(toSummaryMessages(recent), {
      sensitivity: options.sensitivity,
    })
    if (result.summary) {
      await upsertConversationSummary(conversationId, result.summary, result.messageCount)
    }
    const window = recent.slice(-COMPRESS_WINDOW)
    return {
      summary: result.summary,
      recent: window,
      compressed: true,
      messageCount: result.messageCount,
      summaryUsage: result.usage,
    }
  }

  return {
    summary: stored?.summary ?? "",
    recent,
    compressed: false,
    messageCount: recent.length,
  }
}