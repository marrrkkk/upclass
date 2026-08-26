"use client"

/**
 * Chat primitives: assistant/user bubbles, structured data cards, and
 * interactive action proposal cards matching modern clean assistant UI.
 */
import { useMemo, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CornerDownRight,
  FileText,
  Globe,
  Send,
  ThumbsDown,
  ThumbsUp,
  WandSparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import type { AiSourceRef } from "@/lib/ai/types"
import type { StructuredCard } from "@/lib/ai/tools/structured-outputs"

export type AiActionProposalUi = {
  action: string
  payload: Record<string, unknown>
  /** Durable idempotency key issued server-side by the action tool. */
  proposalId?: string
  executed?: boolean
  error?: string
}

/* -------------------------------------------------------------------------- */
/* Dot grid loader animation (3x3 matrix)                                      */
/* -------------------------------------------------------------------------- */

export function DotGridLoader({ label = "Creating..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-medium text-foreground/90">
      <div className="grid grid-cols-3 gap-0.5" aria-hidden="true">
        <span className="size-1 rounded-full bg-sky-500 animate-pulse" />
        <span className="size-1 rounded-full bg-sky-500 animate-pulse [animation-delay:150ms]" />
        <span className="size-1 rounded-full bg-sky-500 animate-pulse [animation-delay:300ms]" />
        <span className="size-1 rounded-full bg-sky-500 animate-pulse [animation-delay:150ms]" />
        <span className="size-1 rounded-full bg-sky-500 animate-pulse [animation-delay:300ms]" />
        <span className="size-1 rounded-full bg-sky-500 animate-pulse [animation-delay:450ms]" />
        <span className="size-1 rounded-full bg-sky-500 animate-pulse [animation-delay:300ms]" />
        <span className="size-1 rounded-full bg-sky-500 animate-pulse [animation-delay:450ms]" />
        <span className="size-1 rounded-full bg-sky-500 animate-pulse [animation-delay:600ms]" />
      </div>
      <span>{label}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Markdown bubble                                                            */
/* -------------------------------------------------------------------------- */

export function AiMarkdown({ content }: { content: string }) {
  return (
    <div data-slot="ai-markdown" className="ai-markdown text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => {
            if (!href) return <span>{children}</span>
            if (href.startsWith("/")) {
              return (
                <Link href={href} className="text-sky-500 font-semibold hover:underline">
                  {children}
                </Link>
              )
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-500 font-semibold hover:underline"
              >
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Web source badges (ChatGPT-style citations for URLs in the answer)          */
/* -------------------------------------------------------------------------- */

const EXTERNAL_URL_REGEX = /https?:\/\/[^\s<>()\[\]{}"'`]+/gi
const MAX_SOURCE_BADGES = 6

export function extractExternalUrls(content: string): URL[] {
  const seen = new Set<string>()
  const urls: URL[] = []
  for (const match of content.matchAll(EXTERNAL_URL_REGEX)) {
    const raw = match[0].replace(/[.,;:!?)\]}'"]+$/, "")
    try {
      const url = new URL(raw)
      if (url.protocol !== "http:" && url.protocol !== "https:") continue
      const key = url.href.replace(/\/$/, "")
      if (seen.has(key)) continue
      seen.add(key)
      urls.push(url)
    } catch {
      // Skip malformed URLs
    }
  }
  return urls
}

function SourceBadges({ urls }: { urls: URL[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Web sources">
      {urls.slice(0, MAX_SOURCE_BADGES).map((url) => {
        const label = url.hostname.replace(/^www\./, "")
        return (
          <a
            key={url.href}
            href={url.href}
            target="_blank"
            rel="noopener noreferrer"
            title={url.href}
            className="inline-flex max-w-56 items-center gap-1.5 rounded-full border border-hairline bg-card py-1 pl-2 pr-2.5 text-xs font-medium text-muted-foreground shadow-e1 transition-colors hover:bg-surface hover:text-foreground"
          >
            <Globe className="size-3.5 shrink-0 text-sky-500" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </a>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Message bubble & Rich Result Cards                                          */
/* -------------------------------------------------------------------------- */

export type AiBubbleProps = {
  role: "user" | "assistant"
  content: string
  status?: "generating" | "failed" | "completed"
  errorReason?: string
  structuredCards?: StructuredCard[]
  actionProposals?: AiActionProposalUi[]
  /** runId of the assistant turn that produced this message (from metadata). */
  runId?: string
  /** Message row id — enables feedback buttons on assistant bubbles. */
  messageId?: string
  /** Data sources the answer was grounded on (from message metadata). */
  sourceRefs?: AiSourceRef[]
  userName?: string | null
  orgSlug: string
  /** Suggested follow-up questions for "Keep exploring" section. */
  followUpSuggestions?: string[]
  onSelectSuggestion?: (suggestion: string) => void
}

function CardLink({ href, label }: { href?: string; label: string }) {
  if (!href) return <span>{label}</span>
  return (
    <Link
      href={href}
      className="ai-card-link inline-flex items-center gap-1 text-xs font-semibold text-sky-500 hover:text-sky-600 hover:underline"
    >
      <span>{label}</span>
      <ArrowRight className="size-3" aria-hidden="true" />
    </Link>
  )
}

function StructuredCardView({ card }: { card: StructuredCard }) {
  switch (card._type) {
    case "classes_list":
    case "resources_list":
      return (
        <div className="space-y-2">
          {card.items.map((item, index) => (
            <div
              key={item.id ?? index}
              className="flex items-center justify-between gap-3 rounded-2xl border border-hairline/80 bg-card p-3 shadow-e1 transition-all hover:border-hairline hover:shadow-e2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <EntityAvatar name={item.title} className="size-8 rounded-xl text-xs font-bold" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  {item.description ? (
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              </div>
              <CardLink href={"url" in item ? item.url : undefined} label="Open" />
            </div>
          ))}
        </div>
      )
    case "classwork_list":
    case "quizzes_list":
      return (
        <div className="space-y-2">
          {card.items.map((item, index) => (
            <div
              key={item.id ?? index}
              className="flex items-center justify-between gap-3 rounded-2xl border border-hairline/80 bg-card p-3 shadow-e1 transition-all hover:border-hairline hover:shadow-e2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {"type" in item ? `${item.type} · ` : ""}
                  {"status" in item ? `${item.status} · ` : ""}
                  {item.dueDate ? `due ${item.dueDate}` : ""}
                </p>
              </div>
              <CardLink href={"url" in item ? item.url : undefined} label="Open" />
            </div>
          ))}
        </div>
      )
    case "class_details":
    case "quiz_details": {
      const item = card.items[0]
      if (!item) return null
      return (
        <div className="rounded-2xl border border-hairline/80 bg-card p-3.5 shadow-e1">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          {"description" in item && item.description ? (
            <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {"status" in item ? <Badge variant="outline">{item.status}</Badge> : null}
            {"memberCount" in item ? <Badge variant="outline">{item.memberCount} members</Badge> : null}
            {"questionCount" in item ? (
              <Badge variant="outline">{item.questionCount} questions</Badge>
            ) : null}
          </div>
        </div>
      )
    }
    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/* Action proposals                                                           */
/* -------------------------------------------------------------------------- */

const ACTION_LABELS: Record<string, string> = {
  create_announcement: "Post announcement",
  create_classwork: "Create classwork",
  create_quiz: "Generate quiz",
  update_class_schedule: "Update class schedule",
  enroll_student: "Enroll student",
}

function ProposalSummary({ proposal }: { proposal: AiActionProposalUi }) {
  const p = proposal.payload
  switch (proposal.action) {
    case "create_announcement":
      return (
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-foreground">Content preview:</p>
          <p className="line-clamp-3 rounded-lg border border-hairline bg-surface-raised/70 p-2 text-muted-foreground">
            {typeof p.content === "string" ? p.content : "—"}
          </p>
        </div>
      )
    case "create_classwork":
      return (
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-foreground">{typeof p.title === "string" ? p.title : "New classwork"}</p>
          {typeof p.description === "string" ? (
            <p className="line-clamp-2 text-muted-foreground">{p.description}</p>
          ) : null}
        </div>
      )
    case "create_quiz":
      return (
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-foreground">{typeof p.title === "string" ? p.title : "New quiz"}</p>
          {Array.isArray(p.questions) ? (
            <p className="text-muted-foreground">{p.questions.length} questions proposed</p>
          ) : null}
        </div>
      )
    default:
      return <pre className="text-[11px] text-muted-foreground">{JSON.stringify(p, null, 2)}</pre>
  }
}

export function ActionProposalCard({
  orgSlug,
  proposal,
  runId,
}: {
  orgSlug: string
  proposal: AiActionProposalUi
  runId?: string
}) {
  const toast = useToast()
  const [state, setState] = useState<"idle" | "executing" | "done" | "error">(
    proposal.executed ? "done" : "idle",
  )

  const execute = async () => {
    if (state === "executing" || state === "done") return
    setState("executing")
    try {
      const response = await fetch(`/api/ai/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug,
          action: proposal.action,
          payload: proposal.payload,
          ...(proposal.proposalId ? { proposalId: proposal.proposalId } : {}),
          ...(runId ? { runId } : {}),
        }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (response.ok && data.success) {
        setState("done")
        toast.success("Action applied successfully")
      } else {
        setState("error")
        toast.error("Could not execute action", data.error)
      }
    } catch {
      setState("error")
      toast.error("Could not execute action")
    }
  }

  return (
    <div className="rounded-2xl border border-hairline/80 bg-card p-3.5 shadow-e1">
      <div className="flex items-center gap-2">
        <WandSparkles className="size-4 text-sky-500" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">
          {state === "done" ? "Completed" : ACTION_LABELS[proposal.action] ?? "Proposed action"}
        </span>
      </div>
      <div className="mt-2.5">
        <ProposalSummary proposal={proposal} />
      </div>
      {state === "error" ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="size-3.5" aria-hidden="true" /> Execution failed — review and try again.
        </p>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        {state === "done" ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden="true" /> Confirmed and applied
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg font-semibold"
            onClick={execute}
            disabled={state === "executing"}
          >
            {state === "executing" ? (
              <>
                <Spinner className="size-3.5" aria-hidden="true" /> Working…
              </>
            ) : (
              <>
                <Send className="size-3.5" aria-hidden="true" /> Confirm
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Bubble                                                                     */
/* -------------------------------------------------------------------------- */

export function AiBubble({
  role,
  content,
  status = "completed",
  errorReason,
  structuredCards,
  actionProposals,
  runId,
  messageId,
  sourceRefs,
  followUpSuggestions,
  onSelectSuggestion,
  orgSlug,
}: AiBubbleProps) {
  const isUser = role === "user"

  const errorMessage = useMemo(() => {
    if (status !== "failed") return null
    switch (errorReason) {
      case "rate_limit":
        return "Too many requests — wait a minute and try again."
      case "budget_exceeded":
        return "The monthly AI credit limit has been reached."
      case "sanitize_rejected":
        return "That message was rejected. Please rephrase it."
      default:
        return "The assistant could not generate a response. Please try again."
    }
  }, [status, errorReason])

  const sourceUrls = useMemo(
    () => (!isUser && status === "completed" ? extractExternalUrls(content) : []),
    [content, isUser, status],
  )

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#0070f3] px-4 py-2.5 text-sm font-medium break-words text-white shadow-sm">
          {content}
        </div>
      </div>
    )
  }

  // Assistant bubble
  return (
    <div className="flex w-full flex-col gap-3">
      {/* Source reading step status */}
      {sourceRefs && sourceRefs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Sources">
          {sourceRefs.map((source) => (
            <div
              key={`${source.kind}-${source.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80"
            >
              <FileText className="size-3.5 opacity-70" aria-hidden="true" />
              <span>Reading {source.label}</span>
            </div>
          ))}
        </div>
      ) : status === "generating" ? (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
          <FileText className="size-3.5 opacity-70" aria-hidden="true" />
          <span>Reading relevant resources</span>
        </div>
      ) : null}

      {/* Main response content */}
      {content.trim() ? (
        <AiMarkdown content={content} />
      ) : null}

      {/* Web source badges for URLs referenced in the answer */}
      {sourceUrls.length > 0 ? <SourceBadges urls={sourceUrls} /> : null}

      {/* Live generating state with 3x3 dot matrix animation */}
      {status === "generating" && (
        <div className="pt-0.5">
          <DotGridLoader label="Creating..." />
        </div>
      )}

      {status === "failed" && errorMessage ? (
        <p className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" /> {errorMessage}
        </p>
      ) : null}

      {/* Structured result cards */}
      {structuredCards?.map((card, index) => (
        <div key={index} className="pt-1">
          <StructuredCardView card={card} />
        </div>
      ))}

      {/* Proposed actions */}
      {actionProposals?.map((proposal, index) => (
        <ActionProposalCard key={index} orgSlug={orgSlug} proposal={proposal} runId={runId} />
      ))}

      {/* Follow-up suggestions: "Keep exploring" */}
      {!isUser && status === "completed" && followUpSuggestions && followUpSuggestions.length > 0 ? (
        <div className="mt-2 space-y-2 border-t border-hairline/60 pt-3">
          <p className="text-xs font-semibold text-muted-foreground/80">Keep exploring</p>
          <div className="flex flex-col gap-2">
            {followUpSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSuggestion?.(suggestion)}
                className="group flex items-center gap-2 text-left text-xs font-medium text-foreground/90 transition-colors hover:text-sky-500"
              >
                <CornerDownRight className="size-3.5 shrink-0 text-sky-500 transition-transform group-hover:translate-x-0.5" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!isUser && status === "completed" && messageId ? (
        <FeedbackButtons messageId={messageId} runId={runId} />
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Feedback (thumbs)                                                           */
/* -------------------------------------------------------------------------- */

function FeedbackButtons({ messageId, runId }: { messageId: string; runId?: string }) {
  const toast = useToast()
  const [rating, setRating] = useState<"up" | "down" | null>(null)
  const [sending, setSending] = useState(false)

  const submit = async (value: "up" | "down") => {
    if (sending || rating === value) return
    setSending(true)
    setRating(value)
    try {
      const response = await fetch(`/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating: value, runId }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "Could not save feedback")
      }
    } catch (error) {
      setRating(null)
      toast.error("Could not save feedback", error instanceof Error ? error.message : undefined)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center gap-1 pt-1" role="group" aria-label="Rate this answer">
      <button
        type="button"
        onClick={() => submit("up")}
        disabled={sending}
        aria-pressed={rating === "up"}
        aria-label="Helpful"
        className={cn(
          "rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          rating === "up" && "text-emerald-600 hover:text-emerald-600",
        )}
      >
        <ThumbsUp className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => submit("down")}
        disabled={sending}
        aria-pressed={rating === "down"}
        aria-label="Not helpful"
        className={cn(
          "rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          rating === "down" && "text-destructive hover:text-destructive",
        )}
      >
        <ThumbsDown className="size-3" aria-hidden="true" />
      </button>
    </div>
  )
}