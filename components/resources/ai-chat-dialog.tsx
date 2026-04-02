"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Loader2, Send, User as UserIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatResourceCitation } from "@/lib/resources/status"
import { cn } from "@/lib/utils"
import type { ResourceCitation } from "@/lib/resources/types"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  citations: ResourceCitation[]
  createdAt: string
}

type AIChatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  resourceId: string
  resourceTitle: string
}

export function AIChatDialog({
  open,
  onOpenChange,
  classId,
  resourceId,
  resourceTitle,
}: AIChatDialogProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const loadChatHistory = async () => {
      setIsLoadingHistory(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/ai/chat?classId=${encodeURIComponent(classId)}&resourceId=${encodeURIComponent(resourceId)}`,
          {
            cache: "no-store",
          },
        )

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string }
          throw new Error(payload.error || "Failed to load chat history")
        }

        const payload = (await response.json()) as {
          sessionId: string | null
          messages: Message[]
        }

        if (!cancelled) {
          setSessionId(payload.sessionId)
          setMessages(payload.messages)
        }
      } catch (historyError) {
        if (!cancelled) {
          setError(historyError instanceof Error ? historyError.message : "Failed to load chat history")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false)
          queueMicrotask(() => inputRef.current?.focus())
        }
      }
    }

    void loadChatHistory()

    return () => {
      cancelled = true
    }
  }, [classId, open, resourceId])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || isLoading) return

    setError(null)
    setInput("")

    const optimisticUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      citations: [],
      createdAt: new Date().toISOString(),
    }

    setMessages((current) => [...current, optimisticUserMessage])
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId,
          resourceId,
          sessionId,
          message,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || "Failed to get AI response")
      }

      const payload = (await response.json()) as {
        sessionId: string
        message: Message
      }

      setSessionId(payload.sessionId)
      setMessages((current) => [...current, payload.message])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to get AI response")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-background">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            Ask AI
          </DialogTitle>
          <DialogDescription>
            Grounded answers for <span className="font-medium text-foreground">{resourceTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {isLoadingHistory ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading chat history...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center space-y-4 px-6">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary/60" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ask about this document</h3>
                <p className="text-sm text-muted-foreground">
                  The assistant will answer only from the uploaded material and cite the source chunks it used.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role === "assistant" ? (
                    <Avatar className="h-8 w-8 mt-1 border">
                      <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                    </Avatar>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-3 shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border text-card-foreground rounded-tl-sm",
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {message.role === "assistant" && message.citations.length > 0 ? (
                      <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                        <p className="mb-2 font-medium text-foreground">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {message.citations.map((citation) => (
                            <span
                              key={`${message.id}-${citation.chunkId}`}
                              className="rounded-full border bg-muted/50 px-2.5 py-1"
                            >
                              {formatResourceCitation(citation)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {message.role === "user" ? (
                    <Avatar className="h-8 w-8 mt-1 border">
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                </div>
              ))}
              {isLoading ? (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 mt-1 border">
                    <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl px-4 py-3 bg-card border rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking over the retrieved material...
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {error ? (
          <div className="px-6 pb-2">
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
              {error}
            </div>
          </div>
        ) : null}

        <div className="p-4 bg-background border-t">
          <form
            onSubmit={handleSend}
            className="relative flex items-end gap-2 rounded-xl border bg-muted/30 p-1.5"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question about this resource..."
              disabled={isLoading || isLoadingHistory}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 h-auto"
              autoComplete="off"
            />
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!input.trim() || isLoadingHistory}
              size="icon"
              className="h-10 w-10 rounded-lg shrink-0"
            >
              {isLoading ? null : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 text-[11px] text-center text-muted-foreground">
            Answers are limited to the uploaded material. If the document does not contain the answer, the assistant will say so.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
