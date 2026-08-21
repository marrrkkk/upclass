/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
 
import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname } from "next/navigation"
import { ArrowLeft, Check, CheckCheck, Clock, FileText, Image as ImageIcon, Paperclip, Send, X } from "lucide-react"
import { format, formatDistanceToNow, isSameDay } from "date-fns"

import { markConversationAsRead, sendMessage } from "@/app/actions/messages"
import { UrlLinkify } from "@/components/messages/url-linkify"
import { Button, buttonVariants } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Input } from "@/components/ui/input"
import { Panel } from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { BackgroundCache } from "@/lib/background-cache"
import { useCacheData, useOfflineCollectionCache } from "@/lib/cache-hooks"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"
import { supabase } from "@/lib/supabase-client"
import { authorizeSupabaseRealtime } from "@/lib/supabase-realtime-auth"
import { useSupabaseUpload } from "@/lib/supabase-storage"
import { cn } from "@/lib/utils"
import { usePageHeaderStore } from "@/stores/page-header-store"

const ImageViewerDialog = dynamic(
  () => import("@/components/messages/image-viewer-dialog").then((mod) => mod.ImageViewerDialog),
  {
    ssr: false,
  },
)

type MediaFile = {
  url: string
  type: string
  name: string
  size?: string | null
}

type MessageData = {
  id: string
  senderId: string
  receiverId: string
  content: string
  media: MediaFile[] | null
  url: string | null
  read: boolean
  createdAt: string
  clientMessageId?: string | null
}

type ChatClientProps = {
  messages: MessageData[]
  currentUserId: string
  otherUser: {
    id: string
    name: string
    image: string | null
    email: string
  }
  conversationId?: string
  orgSlug?: string
  hasMore?: boolean
}

export function ChatClient({ messages: initialMessages, currentUserId, otherUser, orgSlug: orgSlugProp }: ChatClientProps) {
  const pathname = usePathname()
  const orgSlug = orgSlugProp || pathname?.split('/')[1] || ''
  const messagesPath = orgSlug ? `/${orgSlug}/messages` : '/messages'

  const [messages, setMessages] = useState<MessageData[]>(initialMessages)
  const messagesRef = useRef(messages)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const [otherUserPresence, setOtherUserPresence] = useState<{ isOnline: boolean; lastSeen: string | null }>({ isOnline: false, lastSeen: null })

  // Cache messages in background
  useCacheData(messages, 'messages', true)

  useOfflineCollectionCache<MessageData>({
    onlineData: initialMessages,
    getCachedData: () =>
      BackgroundCache.getInstance().getCachedMessagesForThread(currentUserId, otherUser.id),
    onHydrate: setMessages,
  })

  const [newMessage, setNewMessage] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [viewingImages, setViewingImages] = useState<string[]>([])
  const [viewingImageIndex, setViewingImageIndex] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useSupabaseUpload("media")
  const presenceChannelRef = useRef<any>(null)

  // Store optimistic timestamps to preserve them
  const optimisticTimestamps = useRef<Map<string, string>>(new Map())

  // Helper to normalize timestamp from Supabase real-time or database
  const normalizeTimestamp = (timestamp: any): string => {
    if (!timestamp) return new Date().toISOString()
    if (typeof timestamp === 'string') {
      if (timestamp.includes('T') && timestamp.includes('Z')) {
        return timestamp
      }
      return new Date(timestamp).toISOString()
    }
    return new Date(timestamp).toISOString()
  }

  useEffect(() => {
    markConversationAsRead(otherUser.id)
  }, [otherUser.id])

  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)

  useEffect(() => {
    setPageTitle(otherUser.name)
    return () => setPageTitle(null)
  }, [otherUser.name, setPageTitle])

  // Set up presence tracking
  useEffect(() => {
    if (!currentUserId) return

    const checkLastActivity = () => {
      const otherUserMessages = messages.filter((m) => m.senderId === otherUser.id)
      if (otherUserMessages.length > 0) {
        const lastMessage = otherUserMessages[otherUserMessages.length - 1]
        const lastMessageTime = new Date(lastMessage.createdAt).getTime()
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        const wasRecentlyActive = lastMessageTime > fiveMinutesAgo
        
        if (wasRecentlyActive) {
          setOtherUserPresence({ isOnline: true, lastSeen: null })
        } else {
          setOtherUserPresence({ isOnline: false, lastSeen: lastMessage.createdAt })
        }
      } else {
        setOtherUserPresence({ isOnline: false, lastSeen: null })
      }
    }

    checkLastActivity()
    const activityInterval = setInterval(checkLastActivity, 30000)

    if (supabase) {
      try {
        const presenceChannel = supabase.channel("online-users", {
          config: {
            presence: {
              key: currentUserId,
            },
          },
        })

        presenceChannel
          .on("presence", { event: "sync" }, () => {
            const state = presenceChannel.presenceState()
            const otherUserState = state[otherUser.id]
            const isOnline = !!otherUserState && Object.keys(otherUserState).length > 0
            setOtherUserPresence((prev) => ({ isOnline, lastSeen: isOnline ? null : prev.lastSeen }))
          })
          .on("presence", { event: "join" }, ({ key }) => {
            if (key === otherUser.id) {
              setOtherUserPresence({ isOnline: true, lastSeen: null })
            }
          })
          .on("presence", { event: "leave" }, ({ key }) => {
            if (key === otherUser.id) {
              const lastSeen = new Date().toISOString()
              setOtherUserPresence({ isOnline: false, lastSeen })
            }
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await presenceChannel.track({
                user_id: currentUserId,
                online_at: new Date().toISOString(),
              })
            }
          })

        presenceChannelRef.current = presenceChannel

        return () => {
          clearInterval(activityInterval)
          if (presenceChannelRef.current) {
            presenceChannelRef.current.unsubscribe()
            supabase?.removeChannel(presenceChannelRef.current)
          }
        }
      } catch (error) {
        console.warn("Presence tracking not available, using fallback:", error)
        return () => clearInterval(activityInterval)
      }
    } else {
      return () => clearInterval(activityInterval)
    }
  }, [currentUserId, otherUser.id, messages])

  useEffect(() => {
    if (!supabase || !currentUserId) return

    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    void authorizeSupabaseRealtime().then((authorized) => {
      if (!authorized || cancelled || !supabase) return
      channel = supabase
      .channel(`chat:${currentUserId}:${otherUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as any
          if (newMsg.receiver_id === otherUser.id) {
            const prevMessages = messagesRef.current
            const tempIndex = prevMessages.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.content === (newMsg.content || "") &&
                m.senderId === currentUserId &&
                m.receiverId === otherUser.id &&
                JSON.stringify(m.media) === JSON.stringify(newMsg.media ? (typeof newMsg.media === 'string' ? JSON.parse(newMsg.media) : newMsg.media) : null)
            )

            const exists = prevMessages.some((m) => m.id === newMsg.id)
            if (!exists) {
              if (tempIndex >= 0) {
                const tempMsg = prevMessages[tempIndex]
                const preservedTimestamp = optimisticTimestamps.current.get(tempMsg.id) || normalizeTimestamp(newMsg.created_at)
                optimisticTimestamps.current.delete(tempMsg.id)

                setMessages((current) =>
                  current.map((m) =>
                    m.id === tempMsg.id
                      ? {
                          id: newMsg.id,
                          senderId: newMsg.sender_id,
                          receiverId: newMsg.receiver_id,
                          content: newMsg.content || "",
                          media: newMsg.media ? (typeof newMsg.media === 'string' ? JSON.parse(newMsg.media) : newMsg.media) : null,
                          url: null,
                          read: newMsg.read,
                          createdAt: preservedTimestamp,
                        }
                      : m,
                  ),
                )
              } else {
                setMessages((current) => [
                  ...current,
                  {
                    id: newMsg.id,
                    senderId: newMsg.sender_id,
                    receiverId: newMsg.receiver_id,
                    content: newMsg.content || "",
                    media: newMsg.media ? (typeof newMsg.media === 'string' ? JSON.parse(newMsg.media) : newMsg.media) : null,
                    url: null,
                    read: newMsg.read,
                    createdAt: normalizeTimestamp(newMsg.created_at),
                  },
                ])
              }
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as any
          if (newMsg.sender_id === otherUser.id) {
            setMessages((current) => {
              if (current.some((m) => m.id === newMsg.id)) {
                return current
              }
              return [
                ...current,
                {
                  id: newMsg.id,
                  senderId: newMsg.sender_id,
                  receiverId: newMsg.receiver_id,
                  content: newMsg.content || "",
                  media: newMsg.media ? (typeof newMsg.media === 'string' ? JSON.parse(newMsg.media) : newMsg.media) : null,
                  url: null,
                  read: newMsg.read,
                  createdAt: normalizeTimestamp(newMsg.created_at),
                },
              ]
            })

            markConversationAsRead(otherUser.id)
          }
        },
      )
      .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) supabase?.removeChannel(channel)
    }
  }, [currentUserId, otherUser.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length + selectedFiles.length > 10) {
      setError("Maximum 10 files allowed")
      return
    }
    setSelectedFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if ((!newMessage.trim() && selectedFiles.length === 0) || pending || isUploading) return

    setError(null)
    const content = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    const clientMessageId = crypto.randomUUID()
    const optimisticTimestamp = new Date().toISOString()
    optimisticTimestamps.current.set(tempId, optimisticTimestamp)

    let uploadedMedia: MediaFile[] = []
    if (selectedFiles.length > 0) {
      const uploads = await startUpload(selectedFiles)
      if (!uploads) {
        setError("Failed to upload files")
        return
      }
      uploadedMedia = uploads.map((u) => ({
        url: u.url || "",
        type: u.type || "application/octet-stream",
        name: u.name || "Attachment",
        size: u.size?.toString() || null,
      }))
    }

    const optimisticMsg: MessageData = {
      id: tempId,
      senderId: currentUserId,
      receiverId: otherUser.id,
      content,
      media: uploadedMedia.length > 0 ? uploadedMedia : null,
      url: null,
      read: false,
      createdAt: optimisticTimestamp,
      clientMessageId,
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setNewMessage("")
    setSelectedFiles([])

    startTransition(async () => {
      const mediaJson = uploadedMedia.length ? JSON.stringify(uploadedMedia) : undefined
      const result = await executeWithOfflineHandling(
        () => sendMessage({
          orgSlug,
          receiverId: otherUser.id,
          content,
          media: mediaJson,
          clientMessageId,
        }),
        "send-direct-message",
        {
          orgSlug,
          receiverId: otherUser.id,
          content,
          media: mediaJson,
          clientMessageId,
        },
      )

      if (!result.success) {
        setError(result.error || "Failed to send message")
      }
    })
  }

  const handleImageClick = (images: string[], index: number) => {
    setViewingImages(images)
    setViewingImageIndex(index)
    setImageViewerOpen(true)
  }

  const formatMessageTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "h:mm a")
    } catch {
      return ""
    }
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

          <div className="relative">
            <EntityAvatar
              name={otherUser.name}
              image={otherUser.image}
              size="md"
              className="ring-1 ring-hairline/60"
            />
            {otherUserPresence.isOnline ? (
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
            ) : null}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold tracking-tight text-foreground">
              {otherUser.name}
            </h3>
            <div className="flex items-center gap-1.5 pt-0.5">
              <StatusBadge
                tone={otherUserPresence.isOnline ? "success" : "neutral"}
                dot
                size="sm"
                className="text-[11px] font-medium"
              >
                {otherUserPresence.isOnline
                  ? "Active now"
                  : otherUserPresence.lastSeen
                    ? `Last seen ${formatDistanceToNow(new Date(otherUserPresence.lastSeen), {
                        addSuffix: true,
                      })}`
                    : "Offline"}
              </StatusBadge>
            </div>
          </div>
        </div>
      </header>

      {/* Message stream */}
      <div
        ref={messagesContainerRef}
        role="log"
        aria-label={`Conversation with ${otherUser.name}`}
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto bg-surface-subtle/30 px-4 py-5 sm:px-6"
      >
        {messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description={`Send a message to start the conversation with ${otherUser.name.split(" ")[0]}.`}
            className="h-full"
          />
        ) : (
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3.5">
            {messages.map((msg, index) => {
              const isOwn = msg.senderId === currentUserId
              const showAvatar =
                !isOwn && (index === 0 || messages[index - 1].senderId !== msg.senderId)
              const showDate =
                index === 0 ||
                !isSameDay(
                  new Date(msg.createdAt),
                  new Date(messages[index - 1].createdAt),
                )
              const showTimestamp =
                (index < messages.length - 1 &&
                  messages[index + 1].senderId !== msg.senderId) ||
                index === messages.length - 1

              return (
                <div key={msg.id} className="space-y-3">
                  {showDate ? (
                    <div
                      role="separator"
                      aria-label={format(new Date(msg.createdAt), "MMMM d, yyyy")}
                      className="flex items-center justify-center py-2"
                    >
                      <span className="rounded-full bg-surface-raised border border-hairline/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-2xs">
                        {format(new Date(msg.createdAt), "MMMM d, yyyy")}
                      </span>
                    </div>
                  ) : null}

                  <article
                    aria-label={`Message from ${isOwn ? "you" : otherUser.name}`}
                    className={cn("flex items-end gap-2.5", isOwn && "justify-end")}
                  >
                    {!isOwn ? (
                      showAvatar ? (
                        <EntityAvatar
                          name={otherUser.name}
                          image={otherUser.image}
                          size="sm"
                          className="shrink-0 mb-1"
                        />
                      ) : (
                        <span aria-hidden="true" className="size-8 shrink-0" />
                      )
                    ) : null}

                    <div
                      className={cn(
                        "min-w-0 max-w-[85%] space-y-1 sm:max-w-xl",
                        isOwn && "text-right",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed shadow-2xs transition-all",
                          isOwn
                            ? "rounded-br-xs bg-primary text-primary-foreground"
                            : "rounded-bl-xs border border-hairline/80 bg-card text-foreground",
                        )}
                      >
                        {msg.content ? (
                          <div className="whitespace-pre-wrap break-words">
                            <UrlLinkify
                              text={msg.content}
                              linkClassName={isOwn ? "text-primary-foreground underline font-semibold" : "text-primary underline font-semibold"}
                            />
                          </div>
                        ) : null}

                        {/* Media attachments */}
                        {msg.media && msg.media.length > 0 ? (
                          <div className={cn("flex flex-wrap gap-2", msg.content && "mt-2.5")}>
                            {msg.media.map((media, mediaIndex) => {
                              const isImage = media.type.startsWith("image/")
                              const isVideo = media.type.startsWith("video/")
                              const isAudio = media.type.startsWith("audio/")
                              const imageUrls =
                                msg.media
                                  ?.filter((item) => item.type.startsWith("image/"))
                                  .map((item) => item.url) || []

                              return (
                                <div key={`${media.url}-${mediaIndex}`}>
                                  {isImage ? (
                                    <button
                                      type="button"
                                      aria-label={`View ${media.name}`}
                                      onClick={() => {
                                        const imageIndex =
                                          msg.media
                                            ?.filter((item) => item.type.startsWith("image/"))
                                            .findIndex((item) => item.url === media.url) || 0
                                        handleImageClick(imageUrls, imageIndex)
                                      }}
                                      className="group relative block overflow-hidden rounded-xl border border-hairline/60 shadow-xs"
                                    >
                                      <img
                                        src={media.url}
                                        alt={media.name}
                                        className="size-36 object-cover transition-transform duration-200 group-hover:scale-105"
                                      />
                                    </button>
                                  ) : null}
                                  {!isImage && !isVideo && !isAudio ? (
                                    <a
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
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>

                      {/* Status / Timestamp footer below bubble */}
                      {showTimestamp || msg.id.startsWith("temp-") ? (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground",
                            isOwn && "justify-end",
                          )}
                        >
                          {showTimestamp ? (
                            <span>
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          ) : null}
                          {isOwn && msg.read ? (
                            <span className="flex items-center gap-0.5 text-primary">
                              <CheckCheck className="size-3" />
                              <span className="sr-only">Read</span>
                            </span>
                          ) : isOwn && !msg.id.startsWith("temp-") ? (
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <Check className="size-3" />
                              <span className="sr-only">Delivered</span>
                            </span>
                          ) : null}
                          {msg.id.startsWith("temp-") ? (
                            <StatusBadge tone="warning" size="sm" className="gap-1 text-[10px]">
                              <Clock className="size-2.5" />
                              Pending delivery
                            </StatusBadge>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </article>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer footer */}
      <footer className="safe-bottom border-t border-hairline/70 bg-card/90 p-3 backdrop-blur-xs sm:px-4">
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
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="touch-target rounded-md p-0.5 text-muted-foreground hover:bg-surface-hover hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <Callout tone="danger" role="alert" className="mb-2.5 text-xs">
            {error}
          </Callout>
        ) : null}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <label
            htmlFor="direct-message-attachments"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "touch-target size-10 cursor-pointer rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            <Paperclip className="size-4" />
            <span className="sr-only">Attach media</span>
            <input
              id="direct-message-attachments"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileSelect}
              className="sr-only"
              disabled={pending || isUploading || selectedFiles.length >= 10}
            />
          </label>

          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            aria-label={`Message ${otherUser.name}`}
            placeholder={`Message ${otherUser.name}…`}
            disabled={pending || isUploading}
            className="h-10 min-w-0 flex-1 rounded-lg border-hairline/90 bg-surface/70 text-sm shadow-2xs focus-visible:bg-card"
          />

          <Button
            type="submit"
            aria-label="Send message"
            disabled={
              pending ||
              isUploading ||
              (!newMessage.trim() && selectedFiles.length === 0)
            }
            size="icon"
            className="touch-target size-10 rounded-lg font-semibold shadow-2xs"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </footer>

      {imageViewerOpen ? (
        <ImageViewerDialog
          images={viewingImages}
          currentIndex={viewingImageIndex}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
      ) : null}
    </Panel>
  )
}
