"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, ArrowLeft, MoreVertical, Phone, Video } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sendMessage, markConversationAsRead } from "@/app/actions/messages"
import { supabase } from "@/lib/supabase-client"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Paperclip, X, Music, Image as ImageIcon } from "lucide-react"
import { UrlLinkify } from "@/components/messages/url-linkify"
import { ImageViewerDialog } from "@/components/messages/image-viewer-dialog"
import { formatDistanceToNow, isSameDay, format } from "date-fns"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"

type MediaFile = {
  url: string
  type: string
  name: string
  size?: string
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
}

export function ChatClient({ messages: initialMessages, currentUserId, otherUser }: ChatClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
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
  const { startUpload, isUploading } = useUploadThing("messageMediaUploader")

  // Store optimistic timestamps to preserve them
  const optimisticTimestamps = useRef<Map<string, string>>(new Map())

  // Helper to normalize timestamp from Supabase real-time or database
  const normalizeTimestamp = (timestamp: any): string => {
    if (!timestamp) return new Date().toISOString()
    if (typeof timestamp === 'string') {
      // If it's already an ISO string, return it
      if (timestamp.includes('T') && timestamp.includes('Z')) {
        return timestamp
      }
      // Otherwise, try to parse it
      return new Date(timestamp).toISOString()
    }
    // If it's a Date object or timestamp number
    return new Date(timestamp).toISOString()
  }

  useEffect(() => {
    // Mark conversation as read when component mounts
    markConversationAsRead(otherUser.id)
  }, [otherUser.id])

  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)

  useEffect(() => {
    setPageTitle(otherUser.name)
    return () => setPageTitle(null)
  }, [otherUser.name, setPageTitle])

  useEffect(() => {
    if (!supabase || !currentUserId) return

    // Subscribe to real-time messages - listen for messages in both directions
    const channel = supabase
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
          // Message sent by current user
          const newMsg = payload.new as any
          if (newMsg.receiver_id === otherUser.id) {
            // Replace optimistic message with real one
            setMessages((prev) => {
              // Find and remove temp message with matching content and media
              const tempIndex = prev.findIndex(
                (m) =>
                  m.id.startsWith("temp-") &&
                  m.content === (newMsg.content || "") &&
                  m.senderId === currentUserId &&
                  m.receiverId === otherUser.id &&
                  JSON.stringify(m.media) === JSON.stringify(newMsg.media ? (typeof newMsg.media === 'string' ? JSON.parse(newMsg.media) : newMsg.media) : null)
              )

              // Check if real message already exists
              const exists = prev.some((m) => m.id === newMsg.id)
              if (exists) return prev

              // Replace temp with real, or add if no temp found
              if (tempIndex >= 0) {
                const updated = [...prev]
                const tempMsg = updated[tempIndex]
                // Preserve optimistic timestamp if it exists
                const preservedTimestamp = optimisticTimestamps.current.get(tempMsg.id) || normalizeTimestamp(newMsg.created_at)
                optimisticTimestamps.current.delete(tempMsg.id)

                updated[tempIndex] = {
                  id: newMsg.id,
                  senderId: newMsg.sender_id,
                  receiverId: newMsg.receiver_id,
                  content: newMsg.content || "",
                  media: newMsg.media ? (typeof newMsg.media === 'string' ? JSON.parse(newMsg.media) : newMsg.media) : null,
                  url: null, // URLs are now in content
                  read: newMsg.read,
                  createdAt: preservedTimestamp,
                }
                return updated
              } else {
                // No temp found, just add the real message
                return [
                  ...prev,
                  {
                    id: newMsg.id,
                    senderId: newMsg.sender_id,
                    receiverId: newMsg.receiver_id,
                    content: newMsg.content || "",
                    media: newMsg.media ? (typeof newMsg.media === 'string' ? JSON.parse(newMsg.media) : newMsg.media) : null,
                    url: null, // URLs are now in content
                    read: newMsg.read,
                    createdAt: normalizeTimestamp(newMsg.created_at),
                  },
                ]
              }
            })
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${otherUser.id}`,
        },
        (payload) => {
          // Message received from other user
          const newMsg = payload.new as any
          if (newMsg.receiver_id === currentUserId) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === newMsg.id)
              if (exists) return prev

              return [
                ...prev,
                {
                  id: newMsg.id,
                  senderId: newMsg.sender_id,
                  receiverId: newMsg.receiver_id,
                  content: newMsg.content || "",
                  media: newMsg.media ? (typeof newMsg.media === 'string' ? JSON.parse(newMsg.media) : newMsg.media) : null,
                  url: null, // URLs are now in content
                  read: newMsg.read,
                  createdAt: normalizeTimestamp(newMsg.created_at),
                },
              ]
            })
            // Mark as read
            markConversationAsRead(otherUser.id)
          }
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [currentUserId, otherUser.id])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 10) {
      setError("Maximum 10 files allowed")
      return
    }
    setSelectedFiles((prev) => {
      const combined = [...prev, ...files]
      if (combined.length > 10) {
        setError("Maximum 10 files allowed")
        return prev.slice(0, 10)
      }
      return combined.slice(0, 10)
    })
    setError(null)
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const messageContent = newMessage.trim()

    if (!messageContent && selectedFiles.length === 0) {
      setError("Please enter a message or add media")
      return
    }

    if (pending || isUploading) return

    setError(null)

    // Upload media files if any
    let mediaFiles: MediaFile[] = []
    if (selectedFiles.length > 0) {
      try {
        const uploadResults = await startUpload(selectedFiles)
        if (uploadResults) {
          mediaFiles = uploadResults.map((file) => ({
            url: file.ufsUrl || file.url || "",
            type: file.type || "image",
            name: file.name || "file",
            size: file.size?.toString() || "0",
          }))
        }
      } catch (err) {
        console.error(err)
        setError("Failed to upload media files")
        return
      }
    }

    // Optimistically add message with correct timestamp
    const tempId = `temp-${Date.now()}`
    const optimisticTimestamp = new Date().toISOString()
    optimisticTimestamps.current.set(tempId, optimisticTimestamp)

    const optimisticMessage: MessageData = {
      id: tempId,
      senderId: currentUserId,
      receiverId: otherUser.id,
      content: messageContent,
      media: mediaFiles.length > 0 ? mediaFiles : null,
      url: null, // URLs are now detected in text
      read: false,
      createdAt: optimisticTimestamp,
    }
    setMessages((prev) => [...prev, optimisticMessage])

    startTransition(async () => {
      const mediaJson = mediaFiles.length > 0 ? JSON.stringify(mediaFiles) : undefined
      const res = await sendMessage(
        otherUser.id,
        messageContent,
        mediaJson,
        undefined // No separate URL field
      )
      if (!res.success) {
        setError(res.error)
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        optimisticTimestamps.current.delete(tempId)
      } else {
        // Clear form
        setNewMessage("")
        setSelectedFiles([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        // Real-time subscription will replace optimistic message
        setTimeout(() => {
          setMessages((prev) => {
            const hasTemp = prev.some((m) => m.id === tempId)
            if (hasTemp) {
              const hasReal = prev.some(
                (m) =>
                  !m.id.startsWith("temp-") &&
                  m.content === messageContent &&
                  m.senderId === currentUserId &&
                  m.receiverId === otherUser.id &&
                  JSON.stringify(m.media) === JSON.stringify(mediaFiles.length > 0 ? mediaFiles : null)
              )
              if (hasReal) {
                return prev.filter((m) => m.id !== tempId)
              }
            }
            return prev
          })
        }, 2000)
      }
    })
  }

  const handleImageClick = (images: string[], index: number) => {
    setViewingImages(images)
    setViewingImageIndex(index)
    setImageViewerOpen(true)
  }

  const formatMessageTime = (dateString: string) => {
    if (!dateString) return ""
    return format(new Date(dateString), "h:mm a")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-background rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/messages" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-foreground md:hidden")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="relative">
            <Avatar className="h-10 w-10 border border-border/50">
              <AvatarImage src={otherUser.image || undefined} alt={otherUser.name} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
                {getInitials(otherUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background"></div>
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">{otherUser.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Active now</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-6 p-4 bg-muted/20"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
            <Avatar className="h-16 w-16 mb-2 grayscale opacity-50">
              <AvatarImage src={otherUser.image || undefined} alt={otherUser.name} />
              <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-muted-foreground">Send a message to start the conversation with {otherUser.name.split(" ")[0]}.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwn = msg.senderId === currentUserId
              const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== msg.senderId)
              const showDate = index === 0 || !isSameDay(new Date(msg.createdAt), new Date(messages[index - 1].createdAt))

              return (
                <div key={msg.id} className="space-y-4">
                  {showDate && (
                    <div className="flex justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {format(new Date(msg.createdAt), "MMMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex gap-3",
                      isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isOwn && (
                      <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                        {showAvatar ? (
                          <Avatar className="h-8 w-8 border border-border/50">
                            <AvatarImage src={otherUser.image || undefined} alt={otherUser.name} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-600 text-[10px]">
                              {getInitials(otherUser.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    )}

                    <div className={cn("flex flex-col max-w-[75%]", isOwn ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "px-4 py-2.5 rounded-2xl shadow-sm text-sm relative group transition-all duration-200",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-border text-foreground rounded-tl-sm"
                        )}
                      >
                        <div className="space-y-2">
                          {msg.content && (
                            <div className={cn("whitespace-pre-wrap break-words leading-relaxed", isOwn ? "text-primary-foreground" : "text-foreground")}>
                              <UrlLinkify
                                text={msg.content}
                                linkClassName={isOwn ? "text-white underline opacity-90 hover:opacity-100" : "text-primary underline hover:opacity-80"}
                              />
                            </div>
                          )}

                          {/* Media Files */}
                          {msg.media && msg.media.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {msg.media.map((media, idx) => {
                                const isImage = media.type.startsWith("image/")
                                const isVideo = media.type.startsWith("video/")
                                const isAudio = media.type.startsWith("audio/")

                                const imageUrls = msg.media
                                  ?.filter((m) => m.type.startsWith("image/"))
                                  .map((m) => m.url) || []

                                return (
                                  <div key={idx} className="relative">
                                    {isImage && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const imageIndex = msg.media
                                            ?.filter((m) => m.type.startsWith("image/"))
                                            .findIndex((m) => m.url === media.url) || 0
                                          handleImageClick(imageUrls, imageIndex)
                                        }}
                                        className="relative group overflow-hidden rounded-lg"
                                      >
                                        <img
                                          src={media.url}
                                          alt={media.name}
                                          className="h-32 w-32 object-cover border cursor-pointer hover:scale-105 transition-transform duration-300"
                                        />
                                      </button>
                                    )}
                                    {!isImage && !isVideo && !isAudio && (
                                      <a
                                        href={media.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                                          isOwn ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20" : "bg-muted/50 hover:bg-muted"
                                        )}
                                      >
                                        <Paperclip className="h-4 w-4 opacity-70" />
                                        <span className="text-xs truncate max-w-[120px]">{media.name}</span>
                                      </a>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                        </div>

                        <span className={cn(
                          "text-[10px] opacity-70 absolute bottom-1 right-2 hidden group-hover:block transition-all",
                          isOwn ? "text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>

                      {/* Always show timestamp for last message in group */}
                      {((index < messages.length - 1 && messages[index + 1].senderId !== msg.senderId) || index === messages.length - 1) && (
                        <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-60">
                          {msg.read && isOwn ? "Read " : ""}{formatMessageTime(msg.createdAt)}
                        </span>
                      )}

                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-background border-t">
        {selectedFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs shrink-0"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <label className="cursor-pointer pb-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={pending || isUploading || selectedFiles.length >= 10}
            />
            <span
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "text-muted-foreground hover:text-primary transition-colors"
              )}
            >
              <Paperclip className="h-5 w-5" />
            </span>
          </label>

          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[44px] py-3 pr-10 rounded-full bg-muted/30 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background transition-all"
              disabled={pending || isUploading}
            />
          </div>

          <Button
            type="submit"
            disabled={pending || isUploading || (!newMessage.trim() && selectedFiles.length === 0)}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full shrink-0 transition-all duration-300",
              (!newMessage.trim() && selectedFiles.length === 0) ? "opacity-50 scale-95" : "hover:scale-105 shadow-md"
            )}
          >
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </form>
        {error && (
          <p className="text-xs text-destructive mt-2 ml-2">{error}</p>
        )}
      </div>

      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        images={viewingImages}
        currentIndex={viewingImageIndex}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </div>
  )
}

