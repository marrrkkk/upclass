"use client"

/**
 * Shared chat thread used by the full-page chat (variant="page") and the
 * assistant side panel (variant="panel").
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useChat, type UIMessage } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useStickToBottom } from "use-stick-to-bottom"
import {
  ArrowUp,
  BookOpen,
  CornerDownRight,
  Square,
  Wand2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import {
  AiBubble,
  type AiActionProposalUi,
} from "@/components/ai/chat-primitives"
import { isStructuredCard } from "@/lib/ai/tools/structured-outputs"
import type { AiSourceRef } from "@/lib/ai/types"
import type { AiRecommendation } from "@/lib/ai/recommendations"

export type ChatInitialMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  status: "completed" | "failed" | "generating"
  errorReason?: string
  structuredCards?: unknown[]
  actionProposals?: unknown[]
  sourceRefs?: unknown[]
  recommendations?: AiRecommendation[]
  runId?: string
}

export type ChatThreadVariant = "page" | "panel"

export type ChatThreadProps = {
  conversationId: string
  surface: "dashboard" | "class" | "resource"
  entityId: string
  initialMessages: ChatInitialMessage[]
  variant?: ChatThreadVariant
  className?: string
  conversationReady?: boolean
  draftInput?: string
  onDraftInputChange?: (value: string) => void
  queuedMessage?: string | null
  onQueueMessage?: (value: string) => void
  onQueuedMessageSent?: () => void
  contextLabel?: string
}

function toUiMessage(message: ChatInitialMessage): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text" as const, text: message.content }],
  }
}

function bubbleFromInitial(message: ChatInitialMessage, orgSlug: string) {
  const cards = (message.structuredCards ?? [])
    .filter(isStructuredCard)
    .map((card) => card)
  const proposals = (message.actionProposals ?? []).filter(
    (proposal): proposal is AiActionProposalUi =>
      typeof proposal === "object" &&
      proposal !== null &&
      typeof (proposal as { action?: unknown }).action === "string",
  )
  const refs = (message.sourceRefs ?? []).filter(
    (ref): ref is AiSourceRef =>
      typeof ref === "object" &&
      ref !== null &&
      typeof (ref as { id?: unknown }).id === "string" &&
      typeof (ref as { label?: unknown }).label === "string",
  )

  return {
    content: message.content,
    status: message.status,
    errorReason: message.errorReason,
    structuredCards: cards.length > 0 ? cards : undefined,
    actionProposals: proposals.length > 0 ? proposals : undefined,
    sourceRefs: refs.length > 0 ? refs : undefined,
    recommendations: message.recommendations,
    runId: message.runId,
    orgSlug,
  }
}

const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  dashboard: [
    "What homework is due this week?",
    "Summarize my upcoming classes and schedule",
    "What are the latest announcements across classes?",
    "Help me find study resources",
  ],
  class: [
    "What assignments are due in this class?",
    "Summarize the course syllabus and materials",
    "Who are the instructors and students?",
    "Draft an announcement for this class",
  ],
  resource: [
    "Summarize this resource",
    "What are the key takeaways?",
    "Explain the main concepts",
    "Quiz me on this material",
  ],
}

export function ChatThread({
  conversationId,
  surface,
  entityId,
  initialMessages,
  variant = "page",
  className,
  conversationReady = true,
  draftInput,
  onDraftInputChange,
  queuedMessage,
  onQueueMessage,
  onQueuedMessageSent,
  contextLabel,
}: ChatThreadProps) {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const isPanel = variant === "panel"
  const [history, setHistory] = useState<ChatInitialMessage[]>(initialMessages)
  const [internalInput, setInternalInput] = useState("")
  const input = draftInput ?? internalInput
  const setInput = onDraftInputChange ?? setInternalInput

  const initialUi = useMemo(() => history.map(toUiMessage), [history])

  const refreshHistory = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ai/conversations/${conversationId}/messages?limit=50`,
        { cache: "no-store" },
      )
      if (!response.ok) return
      const page = (await response.json()) as {
        messages: Array<{
          id: string
          role: string
          content: string
          status: string
          metadata?: Record<string, unknown>
        }>
      }
      const rows = page.messages.map<ChatInitialMessage>((row) => ({
        id: row.id,
        role: row.role === "user" ? "user" : "assistant",
        content: row.content,
        status: (row.status as ChatInitialMessage["status"]) ?? "completed",
        errorReason:
          (row.metadata?.errorReason as string | undefined) ?? undefined,
        structuredCards: Array.isArray(row.metadata?.structuredOutputs)
          ? row.metadata?.structuredOutputs
          : undefined,
        actionProposals: Array.isArray(row.metadata?.actionProposals)
          ? row.metadata?.actionProposals
          : undefined,
        sourceRefs: Array.isArray(row.metadata?.sourceRefs)
          ? row.metadata?.sourceRefs
          : undefined,
        recommendations: Array.isArray(row.metadata?.recommendations)
          ? (row.metadata?.recommendations as AiRecommendation[])
          : undefined,
        runId:
          typeof row.metadata?.runId === "string" ? (row.metadata?.runId as string) : undefined,
      }))
      setHistory(rows)
    } catch {
      // Keep live stream messages
    }
  }, [conversationId])

  const chat = useChat({
    messages: initialUi,
    transport: new DefaultChatTransport({
      api: "/api/ai/assistant",
      body: { orgSlug, conversationId, surface, entityId },
    }),
    onFinish: () => {
      void refreshHistory()
    },
  })

  const liveMessages = chat.messages.length > 0 ? chat.messages : initialUi
  const isStreaming = chat.status === "streaming" || chat.status === "submitted"
  const sentQueuedMessageRef = useRef<string | null>(null)

  useEffect(() => {
    if (!conversationReady || !queuedMessage || isStreaming) return
    if (sentQueuedMessageRef.current === queuedMessage) return
    sentQueuedMessageRef.current = queuedMessage
    void chat.sendMessage({
      parts: [{ type: "text" as const, text: queuedMessage }],
    })
    onQueuedMessageSent?.()
  }, [chat, conversationReady, isStreaming, onQueuedMessageSent, queuedMessage])

  const { scrollRef, contentRef, scrollToBottom } = useStickToBottom()
  useEffect(() => {
    if (isStreaming) {
      void scrollToBottom({ animation: "instant", preserveScrollPosition: true })
    }
  }, [isStreaming, scrollToBottom])

  const handleSendText = (textToSend: string) => {
    const text = textToSend.trim()
    if (!text || isStreaming) return
    if (!conversationReady) {
      setInput("")
      onQueueMessage?.(text)
      return
    }
    setInput("")
    void chat.sendMessage({
      parts: [{ type: "text" as const, text }],
    })
  }

  const handleSubmit = () => {
    handleSendText(input)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const defaultSuggestions = useMemo(() => {
    if (surface === "resource" && contextLabel) {
      return [`Summarize ${contextLabel}`, `What are the key takeaways from ${contextLabel}?`, `Explain the main concepts in ${contextLabel}`, `Quiz me on ${contextLabel}`]
    }
    return DEFAULT_SUGGESTIONS[surface] || DEFAULT_SUGGESTIONS.dashboard
  }, [contextLabel, surface])
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Messages / Empty State viewport */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" ref={scrollRef}>
        <div
          className={cn(
            "flex flex-1 flex-col justify-end gap-5",
            isPanel ? "w-full px-4 py-4" : "mx-auto w-full max-w-2xl px-4 py-6",
          )}
          ref={contentRef}
        >
          {liveMessages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-end space-y-5 pb-4">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Ask me anything.
              </h2>
              <div className="flex flex-col gap-3">
                {defaultSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendText(item)}
                    className="group flex items-center gap-2.5 text-left text-sm font-medium text-foreground/90 transition-colors hover:text-sky-500"
                  >
                    <CornerDownRight className="size-4 shrink-0 text-sky-500 transition-transform group-hover:translate-x-0.5" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {liveMessages.map((message, index) => {
            const historyRow = history.find((row) => row.id === message.id)
            const isLast = index === liveMessages.length - 1
            const bubble = historyRow
              ? bubbleFromInitial(historyRow, orgSlug)
              : {
                  content: message.parts
                    .filter((part) => part.type === "text")
                    .map((part) => (part as { text: string }).text)
                    .join("\n"),
                  status: (isLast && isStreaming ? "generating" : "completed") as
                    | "generating"
                    | "completed",
                  structuredCards: undefined,
                  actionProposals: undefined,
                  recommendations: undefined,
                  runId: undefined,
                  orgSlug,
                }

            // Follow up suggestions: use recommendations from metadata if available, otherwise fall back to defaults
            const followUps =
              isLast && bubble.status === "completed" && message.role === "assistant"
                ? (bubble.recommendations || [])
                    .slice(0, 3)
                    .map((rec: AiRecommendation) => rec.displayText)
                : undefined

            return (
              <AiBubble
                key={message.id}
                role={message.role === "user" ? "user" : "assistant"}
                content={bubble.content}
                status={bubble.status}
                errorReason={
                  "errorReason" in bubble ? bubble.errorReason : undefined
                }
                structuredCards={bubble.structuredCards}
                actionProposals={bubble.actionProposals}
                sourceRefs={"sourceRefs" in bubble ? bubble.sourceRefs : undefined}
                runId={bubble.runId}
                messageId={message.id}
                orgSlug={orgSlug}
                followUpSuggestions={followUps}
                onSelectSuggestion={handleSendText}
              />
            )
          })}

          {/* Active generating thinking indicator when streaming after user message */}
          {isStreaming &&
          liveMessages.length > 0 &&
          liveMessages[liveMessages.length - 1]?.role === "user" ? (
            <AiBubble
              key="generating-pending"
              role="assistant"
              content=""
              status="generating"
              orgSlug={orgSlug}
            />
          ) : null}
        </div>
      </div>

      {/* Composer at Bottom */}
      <div
        className={cn(
          "shrink-0 pt-1",
          isPanel
            ? "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            : "mx-auto w-full max-w-2xl px-4 pb-5",
        )}
      >
        <div className="rounded-2xl border border-hairline/80 bg-card p-2 shadow-e2 transition-all focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/20">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask the assistant…"
            autoFocus
            rows={1}
            disabled={isStreaming}
            className="max-h-52 min-h-10 resize-none border-0 bg-transparent px-2.5 pt-2 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
          />

          <div className="flex items-center justify-between gap-1 px-1 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="touch-target flex size-7 items-center justify-center rounded-lg bg-surface-raised/80 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                title="AI Prompt Actions"
                aria-label="AI Prompt Actions"
              >
                <Wand2 className="size-3.5" />
              </button>
              <button
                type="button"
                className="touch-target flex size-7 items-center justify-center rounded-lg bg-surface-raised/80 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                title="Class Resources & Documents"
                aria-label="Class Resources & Documents"
              >
                <BookOpen className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={isStreaming ? () => chat.stop() : handleSubmit}
              disabled={!isStreaming && !input.trim()}
              aria-label={isStreaming ? "Stop generating" : "Send message"}
              className="touch-target flex size-7 items-center justify-center rounded-lg bg-sky-500 text-white shadow-xs transition-all hover:bg-sky-600 disabled:opacity-30 disabled:hover:bg-sky-500"
            >
              {isStreaming ? (
                <Square className="size-3 fill-current" aria-hidden="true" />
              ) : (
                <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {chat.error ? (
          <p className="mt-2 px-1 text-xs text-destructive">
            {chat.error instanceof Error ? chat.error.message : "Something went wrong"}
          </p>
        ) : null}
      </div>
    </div>
  )
}
