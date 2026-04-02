"use client"

import { useQueryClient } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { searchMessages } from "@/app/actions/messages"
import { invalidateMessagesCollections } from "@/lib/query-invalidation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

const NewConversationDialog = dynamic(
  () => import("@/components/messages/new-conversation-dialog").then((mod) => mod.NewConversationDialog),
)

type DirectThread = {
  kind: "direct"
  id: string
  userId: string
  title: string
  userName: string
  userImage: string | null
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  href: string
}

type ChannelThread = {
  kind: "channel"
  id: string
  channelId: string
  classId: string
  title: string
  className: string
  classColor: string
  channelName: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  href: string
}

type SearchResult = {
  id: string
  title: string
  subtitle: string
  snippet: string
  href: string
  createdAt: string
}

type MessagesClientProps = {
  threads: Array<DirectThread | ChannelThread>
  channels: ChannelThread[]
  userId: string
  showHeader?: boolean
  isLoading?: boolean
}

export function MessagesClient({
  threads,
  channels,
  userId,
  showHeader = true,
  isLoading = false,
}: MessagesClientProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchPending, startSearchTransition] = useTransition()

  useEffect(() => {
    if (!supabase || !userId) return

    const directChannel = supabase
      .channel(`messages:list:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          void invalidateMessagesCollections(queryClient, userId)
        },
      )
      .subscribe()

    const classChannel = supabase
      .channel(`channel-messages:list:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_messages",
        },
        () => {
          void invalidateMessagesCollections(queryClient, userId)
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(directChannel)
      supabase?.removeChannel(classChannel)
    }
  }, [queryClient, userId])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!searchQuery.trim()) {
      return
    }

    startSearchTransition(async () => {
      const result = await searchMessages(searchQuery)
      if (result.success) {
        setSearchResults(result.results)
      }
    })
  }, [isLoading, searchQuery])

  const filteredThreads = useMemo(() => {
    if (searchQuery.trim()) return []

    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [threads, searchQuery])

  const formatLastMessageTime = (dateString: string) => {
    try {
      return dateString ? formatDistanceToNow(new Date(dateString), { addSuffix: true }) : "No activity"
    } catch {
      return "Just now"
    }
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className={cn("flex h-[calc(100vh-8rem)] flex-col", showHeader ? "gap-6" : "gap-4")}>
      {showHeader ? (
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
            <p className="mt-1 text-muted-foreground">Connect with your classmates and teachers.</p>
          </div>
          <NewConversationDialog currentUserId={userId} channels={channels} />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {!showHeader ? (
          <div className="flex justify-end">
            <NewConversationDialog currentUserId={userId} channels={channels} />
          </div>
        ) : null}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search chats and class channels..."
            value={searchQuery}
            onChange={(event) => {
              const value = event.target.value
              setSearchQuery(value)
              if (!value.trim()) {
                setSearchResults([])
              }
            }}
            className="h-11 border-muted-foreground/20 bg-muted/40 pl-10 transition-all focus-visible:bg-background"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-xl border border-transparent bg-card/40 p-4"
                >
                  <Skeleton className="h-12 w-12 rounded-full border border-border/50" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            searchResults.length === 0 && !searchPending ? (
              <EmptyState title="No results found" description={`Nothing matched "${searchQuery}".`} />
            ) : (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <Link key={result.id} href={result.href}>
                    <div className="rounded-xl border bg-card/40 p-4 transition-all duration-200 hover:border-border hover:bg-card hover:shadow-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{result.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatLastMessageTime(result.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {result.subtitle}
                      </p>
                      <p className="mt-2 truncate text-sm text-muted-foreground">{result.snippet}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : filteredThreads.length === 0 ? (
            <EmptyState title="No messages yet" description="Start a conversation to connect with others." />
          ) : (
            <div className="space-y-2">
              {filteredThreads.map((thread) => (
                <Link key={thread.id} href={thread.href}>
                  <div className="group flex cursor-pointer items-center gap-4 rounded-xl border border-transparent bg-card/40 p-4 transition-all duration-200 hover:border-border hover:bg-card hover:shadow-sm">
                    {thread.kind === "direct" ? (
                      <Avatar className="h-12 w-12 border border-border/50">
                        <AvatarImage src={thread.userImage || undefined} alt={thread.userName} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
                          {getInitials(thread.userName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                        style={{ backgroundColor: thread.classColor }}
                      >
                        #
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-foreground">{thread.title}</span>
                        <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                          {formatLastMessageTime(thread.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "truncate pr-4 text-sm",
                            thread.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {thread.lastMessage}
                        </p>
                        {thread.unreadCount > 0 ? (
                          <Badge
                            variant="default"
                            className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                          >
                            {thread.unreadCount}
                          </Badge>
                        ) : null}
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full animate-in zoom-in-50 flex-col items-center justify-center py-16 text-center duration-500">
      <div className="mb-6 rounded-full bg-muted/50 p-6">
        <Users className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">{description}</p>
    </div>
  )
}
