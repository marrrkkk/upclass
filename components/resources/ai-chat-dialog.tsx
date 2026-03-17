"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

type ResourceContext = {
  title: string
  description: string | null
  category: string | null
  fileType: string
  fileName: string
}

type AIChatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceContext: ResourceContext
}

export function AIChatDialog({ open, onOpenChange, resourceContext }: AIChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const message = input.trim()
    if (!message || isLoading) return

    setError(null)
    setInput("")

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Build conversation history
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          resourceContext,
          conversationHistory,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to get AI response")
      }

      const data = await response.json()

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get AI response"
      setError(message)
      console.error("AI chat error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0 gap-0 overflow-y-auto border-0 shadow-2xl bg-gradient-to-b from-background to-muted/20">
        <DialogHeader className="px-6 py-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-primary">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            AI Assistant
          </DialogTitle>
          <DialogDescription className="text-muted-foreground ml-1">
            Asking about <span className="font-medium text-foreground">{resourceContext.title}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-8">
              <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-2 animate-in zoom-in-50 duration-500">
                <Bot className="h-10 w-10 text-primary/50" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">How can I help you?</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xm mx-auto leading-relaxed">
                  I can summarize this resource, explain complex topics, or answer specific questions about the content.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-6">
                {["Summarize this", "Key takeaways", "Explain the main concept", "Quiz me on this"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 rounded-lg bg-card border hover:border-primary/50 hover:bg-primary/5 hover:text-primary text-sm font-medium transition-all text-muted-foreground shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 mt-1 border shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      message.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-5 py-3 shadow-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border text-card-foreground rounded-tl-sm"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 mt-1 border shadow-sm">
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start animate-pulse">
                  <Avatar className="h-8 w-8 mt-1 border">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl px-5 py-3 bg-card border rounded-tl-sm shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-2">
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive font-medium border border-destructive/20 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
              {error}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-background border-t">
          <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-muted/30 p-1.5 rounded-xl border focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI assistant..."
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 h-auto max-h-[120px] resize-none"
              autoComplete="off"
            />
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!input.trim()}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-lg shrink-0 transition-all",
                input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {isLoading ? null : <Send className="h-5 w-5 ml-0.5" />}
            </Button>
          </form>
          <div className="text-[10px] text-center text-muted-foreground mt-2">
            AI can make mistakes. Check important info.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

