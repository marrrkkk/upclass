"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { Bot, RotateCcw, Send } from "lucide-react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

type ResourceContext = {
  id: string
  title: string
}

type AIChatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceContext: ResourceContext
}

const suggestions = [
  "Summarize this",
  "Key takeaways",
  "Explain the main concept",
  "Quiz me on this",
]

export function AIChatDialog({ open, onOpenChange, resourceContext }: AIChatDialogProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: {
        resourceId: resourceContext.id,
      },
    }),
  })

  const [input, setInput] = useState("")

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || status !== "ready") return

    sendMessage({ text: message })
    setInput("")
  }

  const handleRetry = () => {
    if (status === "ready" || status === "error") {
      regenerate()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }

  const renderAssistantContent = (content: string) => (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="mb-2 text-base font-semibold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-sm font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 text-sm font-medium">{children}</h3>,
        p: ({ children }) => <p className="mb-2 break-words last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        a: ({ href, children }) => {
          let safeHref: string | null = null
          if (href) {
            try {
              const url = new URL(href, window.location.origin)
              if (url.protocol === "http:" || url.protocol === "https:") {
                safeHref = url.href
              }
            } catch {
              safeHref = null
            }
          }
          if (!safeHref) {
            return <span>{children}</span>
          }
          return (
            <a
              href={safeHref}
              target="_blank"
              rel="noreferrer"
              className="text-primary-strong underline underline-offset-2"
            >
              {children}
            </a>
          )
        },
        code: ({ className, children }) => (
          <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]", className)}>
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="mb-2 overflow-x-auto rounded bg-muted p-3 font-mono text-xs last:mb-0">
            {children}
          </pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-3">
          <IconBadge tone="primary" size="md">
            <Bot />
          </IconBadge>
          <span className="min-w-0">
            <span className="block type-h3">AI assistant</span>
          </span>
        </span>
      }
      description={`Asking about ${resourceContext.title}`}
      desktopClassName="sm:max-w-xl"
      mobileClassName="max-h-[100dvh]"
      footer={
        <div>
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-label="Message AI assistant"
              placeholder="Ask a question"
              disabled={status !== "ready"}
              autoComplete="off"
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              isLoading={status === "streaming" || status === "submitted"}
              disabled={!input.trim() || status !== "ready"}
              aria-label="Send message"
              className="touch-target"
            >
              {status === "streaming" || status === "submitted" ? null : <Send />}
            </Button>
          </form>
          <Text variant="caption" tone="subtle" className="mt-2 text-center">
            Check important information before using it.
          </Text>
        </div>
      }
    >
      <div
        role="log"
        aria-label="AI conversation"
        aria-live="polite"
        className="space-y-5"
      >
          {messages.length === 0 ? (
            <EmptyState
              icon={<Bot />}
              tone="primary"
              title="Ask about this resource"
              description="Choose a prompt or enter a question."
              action={
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(suggestion)}
                      disabled={status !== "ready"}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              }
              className="h-full px-0 py-8"
            />
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3",
                  message.role === "user" && "flex-row-reverse",
                )}
              >
                <EntityAvatar
                  name={message.role === "assistant" ? "AI" : "You"}
                  colorKey={message.role}
                  size="sm"
                />
                <div
                  className={cn(
                    "flex max-w-[80%] min-w-0 flex-col gap-1",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg border px-4 py-3",
                      message.role === "user"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-hairline bg-card",
                    )}
                  >
                    {message.role === "assistant" ? (
                      message.parts.map((part) =>
                        part.type === "text" ? (
                          <div key={part.text}>{renderAssistantContent(part.text)}</div>
                        ) : null,
                      )
                    ) : (
                      <Text variant="small" tone="inverse" className="whitespace-pre-wrap break-words">
                        {message.parts.map((part) =>
                          part.type === "text" ? part.text : null,
                        )}
                      </Text>
                    )}
                  </div>
                  <Text variant="caption" tone="subtle">
                    {formatTime(new Date())}
                  </Text>
                </div>
              </div>
            ))
          )}

          {status === "streaming" || status === "submitted" ? (
            <div className="flex items-start gap-3">
              <EntityAvatar name="AI" colorKey="assistant" size="sm" />
              <div className="rounded-lg border border-hairline bg-card px-4 py-3">
                <Text variant="small" tone="muted" className="whitespace-pre-wrap break-words">
                  {status === "submitted" ? "Thinking…" : ""}
                </Text>
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />

          {error ? (
            <div className="space-y-2">
              <Callout tone="danger" role="alert">
                {error instanceof Error ? error.message : "Something went wrong"}
              </Callout>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={status !== "ready" && status !== "error"}
                >
                  <RotateCcw />
                  Retry
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </ResponsiveOverlay>
    )
  }
