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
  getCompletedMessagesAfter,
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
  const summarizedCount = stored?.messageCount ?? 0
  const unsummarized = await getCompletedMessagesAfter(conversationId, summarizedCount)
  const totalCount = summarizedCount + unsummarized.length

  if (recent.length === 0) {
    return { summary: stored?.summary ?? "", recent: [], compressed: false, messageCount: summarizedCount }
  }

  if (shouldSummarize(unsummarized.length)) {
    const result = await summarizeConversation(toSummaryMessages(unsummarized), {
      sensitivity: options.sensitivity,
      priorSummary: stored?.summary,
    })
    if (result.summary) {
      await upsertConversationSummary(conversationId, result.summary, totalCount)
    }
    const window = recent.slice(-COMPRESS_WINDOW)
    return {
      summary: result.summary,
      recent: window,
      compressed: true,
      messageCount: totalCount,
      summaryUsage: result.usage,
    }
  }

  return {
    summary: stored?.summary ?? "",
    recent,
    compressed: false,
    messageCount: totalCount,
  }
}
