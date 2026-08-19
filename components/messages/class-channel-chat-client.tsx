"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, FileText, Hash, Paperclip, Send, Users, X } from "lucide-react"

import { markChannelAsRead, sendChannelMessage } from "@/app/actions/messages"
import { Button, buttonVariants } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Input } from "@/components/ui/input"
import { Panel } from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"
import { supabase } from "@/lib/supabase-client"
import { authorizeSupabaseRealtime } from "@/lib/supabase-realtime-auth"
import { useSupabaseUpload } from "@/lib/supabase-storage"
import { cn } from "@/lib/utils"

type MediaFile = {
  url: string
  type: string
  name: string
  size?: string | null
}

type ChannelMessage = {
  id: string
  senderId: string
  content: string
  media: MediaFile[] | null
  createdAt: string
  clientMessageId?: string | null
  sender: {
    id: string
    name: string
    image: string | null
  }
}

type ClassChannelChatClientProps = {
  channelId: string
  className: string
  classColor: string
  currentUserId: string
  messages: ChannelMessage[]
  orgSlug?: string
  hasMore?: boolean
}

export function ClassChannelChatClient({
  channelId,
  className,
  classColor,
  currentUserId,
  messages: initialMessages,
  orgSlug: orgSlugProp,
}: ClassChannelChatClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const orgSlug = orgSlugProp || pathname?.split('/')[1] || ''
  const messagesPath = orgSlug ? `/${orgSlug}/messages` : '/messages'

  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { startUpload, isUploading } = useSupabaseUpload("media")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    void markChannelAsRead(channelId)
  }, [channelId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!supabase) return

    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    void authorizeSupabaseRealtime().then((authorized) => {
      if (!authorized || cancelled || !supabase) return
      channel = supabase
      .channel(`class-channel:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          router.refresh()
        },
      )
      .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) supabase?.removeChannel(channel)
    }
  }, [channelId, router])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if ((!newMessage.trim() && selectedFiles.length === 0) || pending || isUploading) return

    setError(null)

    let uploadedMedia: MediaFile[] = []
    if (selectedFiles.length > 0) {
      const uploads = await startUpload(selectedFiles)
      if (!uploads) {
        setError("Failed to upload attachments")
        return
      }

      uploadedMedia = uploads.map((file) => ({
        url: file.url || "",
        type: file.type || "application/octet-stream",
        name: file.name || "Attachment",
        size: file.size?.toString() || null,
      }))
    }

    startTransition(async () => {
      const mediaJson = uploadedMedia.length ? JSON.stringify(uploadedMedia) : undefined
      const clientMessageId = crypto.randomUUID()
      const result = await executeWithOfflineHandling(
        () => sendChannelMessage({
          orgSlug,
          channelId,
          content: newMessage.trim(),
          media: mediaJson,
          clientMessageId,
        }),
        "send-channel-message",
        {
          orgSlug,
          channelId,
          content: newMessage.trim(),
          media: mediaJson,
          clientMessageId,
        },
      )

      if (!result.success) {
        setError(result.error || "Failed to send channel message")
        if (result.queued) {
          setNewMessage("")
          setSelectedFiles([])
        }
        return
      }

      setNewMessage("")
      setSelectedFiles([])
      router.refresh()
    })
  }

  return (
    <Panel
      padding="none"
      className="flex h-[calc(100dvh-10rem)] min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1"
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-hairline/70 bg-card/90 px-4 py-3.5 backdrop-blur-xs sm:px-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm" className="rounded-xl md:hidden">
            <Link href={messagesPath} aria-label="Back to messages">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <EntityAvatar
            name={className}
            colorKey={classColor || className}
            shape="square"
            size="md"
            className="ring-1 ring-hairline/60 shadow-2xs"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-bold tracking-tight text-foreground">
                {className}
              </h3>
              <StatusBadge tone="info" size="sm" className="gap-1 font-semibold text-[11px]">
                <Hash className="size-2.5" />
                General channel
              </StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground">
              Class discussion and announcements
            </p>
          </div>
        </div>
      </header>

      {/* Stream body */}
      <div
        role="log"
        aria-label={`${className} general channel`}
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto bg-surface-subtle/30 px-4 py-5 sm:px-6"
      >
        {messages.length === 0 ? (
          <EmptyState
            title="No channel messages yet"
            description="Start a class discussion or share an update."
            className="h-full"
          />
        ) : (
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3.5">
            {messages.map((message) => {
              const isOwn = message.senderId === currentUserId

              return (
                <article
                  key={message.id}
                  aria-label={`Message from ${isOwn ? "you" : message.sender.name}`}
                  className={cn("flex items-end gap-2.5", isOwn && "justify-end")}
                >
                  {!isOwn ? (
                    <EntityAvatar
                      name={message.sender.name}
                      image={message.sender.image}
                      size="sm"
                      className="shrink-0 mb-1"
                    />
                  ) : null}

                  <div
                    className={cn(
                      "min-w-0 max-w-[85%] space-y-1 sm:max-w-xl",
                      isOwn && "text-right",
                    )}
                  >
                    {!isOwn ? (
                      <span className="px-1 text-[11px] font-semibold text-muted-foreground">
                        {message.sender.name}
                      </span>
                    ) : null}

                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed shadow-2xs transition-all",
                        isOwn
                          ? "rounded-br-xs bg-primary text-primary-foreground"
                          : "rounded-bl-xs border border-hairline/80 bg-card text-foreground",
                      )}
                    >
                      {message.content ? (
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      ) : null}

                      {message.media?.length ? (
                        <div className={cn("space-y-2", message.content && "mt-2.5")}>
                          {message.media.map((media, index) => (
                            <a
                              key={`${media.url}-${index}`}
                              href={media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                                isOwn
                                  ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
                                  : "border-hairline bg-surface-raised text-foreground hover:border-hairline-strong hover:bg-surface-hover",
                              )}
                            >
                              <FileText className="size-4 shrink-0" />
                              <span className="max-w-44 truncate font-medium">
                                {media.name}
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer footer */}
      <footer className="border-t border-hairline/70 bg-card/90 p-3 backdrop-blur-xs sm:px-4">
        {selectedFiles.length > 0 ? (
          <div
            role="list"
            aria-label="Selected attachments"
            className="mb-2.5 flex flex-wrap gap-2"
          >
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                role="listitem"
                className="flex items-center gap-2 rounded-xl border border-hairline/80 bg-surface-sunken px-3 py-1.5 text-xs shadow-2xs"
              >
                <Paperclip className="size-3.5 text-primary" />
                <span className="max-w-36 truncate font-medium text-foreground">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedFiles((current) =>
                      current.filter((_, currentIndex) => currentIndex !== index),
                    )
                  }
                  aria-label={`Remove ${file.name}`}
                  className="rounded-md p-0.5 text-muted-foreground hover:bg-surface-hover hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <Callout
            tone={error.toLowerCase().includes("queue") ? "warning" : "danger"}
            role="alert"
            className="mb-2.5 text-xs"
          >
            {error}
          </Callout>
        ) : null}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <label
            htmlFor="channel-message-attachments"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "size-9 cursor-pointer rounded-xl text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            <Paperclip className="size-4" />
            <span className="sr-only">Attach files</span>
            <input
              id="channel-message-attachments"
              type="file"
              multiple
              className="sr-only"
              disabled={pending || isUploading}
              onChange={(event) =>
                setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 5))
              }
            />
          </label>

          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            aria-label={`Message ${className}`}
            placeholder={`Message #${className}…`}
            disabled={pending || isUploading}
            className="h-10 min-w-0 flex-1 rounded-lg border-hairline/90 bg-surface/70 text-sm shadow-2xs focus-visible:bg-card"
          />

          <Button
            type="submit"
            aria-label="Send channel message"
            size="icon"
            disabled={
              pending ||
              isUploading ||
              (!newMessage.trim() && selectedFiles.length === 0)
            }
            className="size-10 rounded-lg font-semibold shadow-2xs"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </footer>
    </Panel>
  )
}
