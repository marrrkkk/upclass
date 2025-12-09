"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { sendMessage, markConversationAsRead } from "@/app/actions/messages"
import { supabase } from "@/lib/supabase-client"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Paperclip, X, Video, Music, Image as ImageIcon } from "lucide-react"
import { UrlLinkify } from "@/components/messages/url-linkify"
import { ImageViewerDialog } from "@/components/messages/image-viewer-dialog"

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
      supabase.removeChannel(channel)
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

  const formatTime = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    // Format in user's local timezone - the database stores UTC, Date will convert automatically
    return date.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit"
    })
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
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Link href="/home/messages" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser.image || undefined} alt={otherUser.name} />
          <AvatarFallback className="bg-blue-600 text-white">
            {getInitials(otherUser.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{otherUser.name}</p>
          <p className="text-xs text-muted-foreground">{otherUser.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId
              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-3", isOwn ? "justify-end" : "justify-start")}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={otherUser.image || undefined} alt={otherUser.name} />
                      <AvatarFallback className="bg-blue-600 text-white text-xs">
                        {getInitials(otherUser.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("flex flex-col max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                    <Card
                      className={cn(
                        "px-4 py-2",
                        isOwn
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-muted",
                      )}
                    >
                      <CardContent className="p-0 space-y-2">
                        {msg.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            <UrlLinkify
                              text={msg.content}
                              linkClassName={isOwn ? "text-blue-100" : "text-blue-600"}
                            />
                          </p>
                        )}
                        
                        {/* Media Files */}
                        {msg.media && msg.media.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {msg.media.map((media, idx) => {
                              const isImage = media.type.startsWith("image/")
                              const isVideo = media.type.startsWith("video/")
                              const isAudio = media.type.startsWith("audio/")
                              
                              // Get all image URLs for the viewer
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
                                      className="relative group"
                                    >
                                      <img
                                        src={media.url}
                                        alt={media.name}
                                        className="h-32 w-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </button>
                                  )}
                                  {isVideo && (
                                    <video
                                      src={media.url}
                                      controls
                                      className="h-32 w-32 object-cover rounded-lg border"
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  )}
                                  {isAudio && (
                                    <div className="p-3 flex items-center gap-2 rounded-lg border bg-background/50 min-w-[200px]">
                                      <Music className="h-5 w-5 text-muted-foreground" />
                                      <audio src={media.url} controls className="flex-1">
                                        Your browser does not support the audio tag.
                                      </audio>
                                    </div>
                                  )}
                                  {!isImage && !isVideo && !isAudio && (
                                    <a
                                      href={media.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors"
                                    >
                                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                                      <span className="text-sm truncate max-w-[150px]">{media.name}</span>
                                    </a>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      {msg.createdAt ? formatTime(msg.createdAt) : "Sending..."}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {error && (
        <p className="text-sm text-destructive px-4 pb-2">{error}</p>
      )}
      
      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/50">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSend} className="flex gap-2 pt-4 border-t px-4 pb-4">
        <label className="cursor-pointer">
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
              buttonVariants({ variant: "outline", size: "icon" }),
              "disabled:opacity-50"
            )}
          >
            <Paperclip className="h-4 w-4" />
          </span>
        </label>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message... (URLs will be auto-detected)"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
          disabled={pending || isUploading}
        />
        <button
          type="submit"
          disabled={pending || isUploading || (!newMessage.trim() && selectedFiles.length === 0)}
          className={cn(
            buttonVariants(),
            "bg-blue-600 hover:bg-blue-700 disabled:opacity-70",
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      
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

