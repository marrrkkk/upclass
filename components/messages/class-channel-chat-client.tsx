"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Hash, Paperclip, Send, X } from "lucide-react"

import { markChannelAsRead, sendChannelMessage } from "@/app/actions/messages"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStorageUpload } from "@/lib/storage/client"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"

type MediaFile = {
  url: string
  type: string
  name: string
  size?: string | null
  bucket?: string | null
  path?: string | null
}

type ChannelMessage = {
  id: string
  senderId: string
  content: string
  media: MediaFile[] | null
  createdAt: string
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
}

export function ClassChannelChatClient({
  channelId,
  className,
  classColor,
  currentUserId,
  messages: initialMessages,
}: ClassChannelChatClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { startUpload, isUploading } = useStorageUpload()
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

    const channel = supabase
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

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [channelId, router])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if ((!newMessage.trim() && selectedFiles.length === 0) || pending || isUploading) return

    setError(null)

    let uploadedMedia: MediaFile[] = []
    if (selectedFiles.length > 0) {
      try {
        const uploads = await startUpload({
          purpose: "channel-message-media",
          files: selectedFiles,
          context: {
            channelId,
          },
        })
        if (!uploads) {
          setError("Failed to upload attachments")
          return
        }

        uploadedMedia = uploads.map((file) => ({
          url: file.url || "",
          type: file.type || "application/octet-stream",
          name: file.name || "Attachment",
          size: file.size?.toString() || null,
          bucket: file.bucket || null,
          path: file.path || null,
        }))
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to upload attachments")
        return
      }
    }

    startTransition(async () => {
      const mediaJson = uploadedMedia.length ? JSON.stringify(uploadedMedia) : undefined
      const result = await executeWithOfflineHandling(
        () => sendChannelMessage(channelId, newMessage.trim(), mediaJson),
        "send-channel-message",
        {
          channelId,
          content: newMessage.trim(),
          media: mediaJson,
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
    <div className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="flex items-center gap-3 border-b bg-card/50 p-3">
        <Link href="/messages" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: classColor }}
        >
          <Hash className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">{className}</p>
          <p className="text-xs text-muted-foreground">General channel</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4">
        {messages.map((message) => {
          const isOwn = message.senderId === currentUserId
          return (
            <div
              key={message.id}
              className={cn("flex gap-3", isOwn ? "justify-end" : "justify-start")}
            >
              {!isOwn ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender.image || undefined} alt={message.sender.name} />
                  <AvatarFallback>{message.sender.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : null}
              <div className={cn("max-w-[75%] space-y-1", isOwn ? "items-end" : "items-start")}>
                {!isOwn ? <p className="text-xs font-medium text-muted-foreground">{message.sender.name}</p> : null}
                <div className={cn("rounded-2xl px-4 py-2.5 text-sm shadow-sm", isOwn ? "bg-primary text-primary-foreground" : "border bg-card")}>
                  {message.content ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : null}
                  {message.media?.length ? (
                    <div className="mt-2 space-y-2">
                      {message.media.map((media, index) => (
                        <a
                          key={`${media.url}-${index}`}
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border bg-background/60 p-2 text-xs underline"
                        >
                          {media.name}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="space-y-3 border-t bg-card/50 p-3">
        {selectedFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs">
                <span>{file.name}</span>
                <button type="button" onClick={() => setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <label className={cn(buttonVariants({ variant: "outline", size: "icon" }), "cursor-pointer")}>
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 5))}
            />
          </label>
          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder={`Message ${className}...`}
          />
          <Button type="submit" disabled={pending || isUploading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </div>
  )
}
