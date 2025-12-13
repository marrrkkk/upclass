"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageSquare, Send, Search, PlusCircle, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { NewConversationDialog } from "@/components/messages/new-conversation-dialog"
import { formatDistanceToNow, parseISO } from "date-fns"

type Conversation = {
  userId: string
  userName: string
  userImage: string | null
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

type MessagesClientProps = {
  conversations: Conversation[]
  userId: string
}

export function MessagesClient({ conversations: initialConversations, userId }: MessagesClientProps) {
  const [conversations, setConversations] = useState(initialConversations)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!supabase || !userId) return

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          // In a real app, we'd fetch the latest conversation data here.
          // For now, reloading ensures we get the fresh state from the server data prop if re-fetched,
          // but a better approach is optimistic updates or re-fetching via router.refresh().
          // Replacing window.location.reload() with router refresh is better UX but requires logic.
          // We'll stick to the existing behavior for now but safeguard it.
          window.location.reload()
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [userId])

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatLastMessageTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (e) {
      return "Just now"
    }
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
    <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
      <div className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Connect with your classmates and teachers.
          </p>
        </div>
        <NewConversationDialog currentUserId={userId} />
      </div>

      <div className="flex flex-col gap-4 flex-1 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-muted/40 border-muted-foreground/20 focus-visible:bg-background transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-50 duration-500 h-full">
              <div className="rounded-full bg-muted/50 p-6 mb-6">
                <Users className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {searchQuery ? "No conversations found" : "No messages yet"}
              </h3>
              <p className="mt-2 text-muted-foreground max-w-sm">
                {searchQuery
                  ? `We couldn't find any conversations matching "${searchQuery}"`
                  : "Start a conversation to connect with others."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conv) => (
                <Link key={conv.userId} href={`/messages/${conv.userId}`}>
                  <div className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-card hover:border-border hover:shadow-sm transition-all duration-200 cursor-pointer bg-card/40">
                    <Avatar className="h-12 w-12 border border-border/50">
                      <AvatarImage src={conv.userImage || undefined} alt={conv.userName} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
                        {getInitials(conv.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-foreground truncate">{conv.userName}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatLastMessageTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate pr-4",
                          conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="h-5 min-w-[1.25rem] px-1.5 flex justify-center items-center rounded-full text-[10px] font-bold">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

