"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Hash, MessageSquare, MessageSquareText, Search, Sparkles, User, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { searchMessages } from "@/app/actions/messages"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Input } from "@/components/ui/input"
import { ResponsiveSplitView } from "@/components/ui/responsive-split-view"
import { PageContainer, PageHeading } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { supabase } from "@/lib/supabase-client"
import { authorizeSupabaseRealtime } from "@/lib/supabase-realtime-auth"
import { cn } from "@/lib/utils"

const NewConversationDialog = dynamic(
  () =>
    import("@/components/messages/new-conversation-dialog").then(
      (mod) => mod.NewConversationDialog,
    ),
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
  userId: string
  orgSlug: string
  showHeader?: boolean
}

export function MessagesClient({
  threads,
  userId,
  orgSlug,
  showHeader = true,
}: MessagesClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchPending, startSearchTransition] = useTransition()

  useEffect(() => {
    if (!supabase || !userId) return
    let cancelled = false
    let directChannel: ReturnType<typeof supabase.channel> | null = null
    let classChannel: ReturnType<typeof supabase.channel> | null = null

    void authorizeSupabaseRealtime().then((authorized) => {
      if (!authorized || cancelled || !supabase) return
      directChannel = supabase
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
          router.refresh()
        },
      )
      .subscribe()

      classChannel = supabase
      .channel(`channel-messages:list:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_messages",
        },
        () => {
          router.refresh()
        },
      )
      .subscribe()
    })

    return () => {
      cancelled = true
      if (directChannel) supabase?.removeChannel(directChannel)
      if (classChannel) supabase?.removeChannel(classChannel)
    }
  }, [router, userId])

  useEffect(() => {
    if (!searchQuery.trim()) {
      return
    }

    startSearchTransition(async () => {
      const result = await searchMessages(searchQuery, orgSlug)
      if (result.success) {
        setSearchResults(result.results)
      }
    })
  }, [searchQuery, orgSlug])

  const filteredThreads = useMemo(() => {
    if (searchQuery.trim()) return []

    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [threads, searchQuery])

  const totalUnread = useMemo(() => {
    return threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0)
  }, [threads])

  const formatLastMessageTime = (dateString: string) => {
    try {
      return dateString
        ? formatDistanceToNow(new Date(dateString), { addSuffix: true })
        : "No activity"
    } catch {
      return "Just now"
    }
  }

  const newConversation = (
    <NewConversationDialog currentUserId={userId} />
  )

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Inbox Header & Search Controls */}
      <div className="border-b border-hairline/70 bg-card/60 p-4 backdrop-blur-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-foreground">Inbox</h2>
            {totalUnread > 0 ? (
              <span className="inline-flex items-center justify-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {totalUnread} new
              </span>
            ) : (
              <span className="inline-flex items-center justify-center rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {threads.length}
              </span>
            )}
          </div>
          {!showHeader ? (
            <NewConversationDialog
              currentUserId={userId}
              triggerVariant="compact"
            />
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Direct messages and class channels
        </p>

        {/* Search Bar */}
        <div className="relative mt-3.5">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search messages"
            type="search"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(event) => {
              const value = event.target.value
              setSearchQuery(value)
              if (!value.trim()) {
                setSearchResults([])
              }
            }}
            className="h-10 rounded-lg border-hairline/90 bg-surface/70 pl-9 pr-8 text-sm placeholder:text-muted-foreground/70 focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-primary/40 shadow-2xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setSearchResults([])
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Thread list / Search results */}
      <div className="minimal-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {searchQuery.trim() ? (
          searchResults.length === 0 ? (
            searchPending ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center" role="status">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <Text variant="small" tone="muted">
                  Searching messages…
                </Text>
              </div>
            ) : (
              <EmptyState
                icon={<Search className="size-5" />}
                title="No results found"
                description={`Nothing matched “${searchQuery}”.`}
                className="py-8"
              />
            )
          ) : (
            <ul aria-label="Message search results" className="space-y-1.5">
              {searchResults.map((result) => (
                <li key={result.id}>
                  <Link
                    href={result.href}
                    className="touch-target focus-ring group block rounded-xl border border-transparent p-3 transition-all hover:border-hairline/80 hover:bg-surface-raised hover:shadow-2xs active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {result.title}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-muted-foreground/80">
                        {formatLastMessageTime(result.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {result.subtitle}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {result.snippet}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : filteredThreads.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<MessageSquareText className="size-6" />}
              title="No messages yet"
              description="Start a conversation to connect with a classmate or teacher."
              action={newConversation}
            />
          </div>
        ) : (
          <ul aria-label="Message threads" className="space-y-1">
            {filteredThreads.map((thread) => {
              const hasUnread = thread.unreadCount > 0

              return (
                <li key={thread.id}>
                  <Link
                    href={thread.href}
                    className={cn(
                      "touch-target focus-ring group relative flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all duration-150",
                      hasUnread
                        ? "border-primary/20 bg-card shadow-2xs hover:border-primary/40 hover:bg-card"
                        : "hover:border-hairline/80 hover:bg-surface-raised hover:shadow-2xs active:scale-[0.99]",
                    )}
                  >
                    {/* Avatar with kind badge */}
                    <div className="relative shrink-0">
                      {thread.kind === "direct" ? (
                        <EntityAvatar
                          name={thread.userName}
                          image={thread.userImage}
                          size="md"
                          className="ring-1 ring-hairline/60"
                        />
                      ) : (
                        <EntityAvatar
                          name={thread.className}
                          colorKey={thread.classColor || thread.classId}
                          shape="square"
                          size="md"
                          className="ring-1 ring-hairline/60 shadow-2xs"
                        />
                      )}
                      {thread.kind === "channel" ? (
                        <div className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-surface-raised border border-hairline text-muted-foreground shadow-xs">
                          <Hash className="size-2.5" />
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-surface-raised border border-hairline text-muted-foreground shadow-xs">
                          <User className="size-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Thread Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm tracking-tight",
                            hasUnread
                              ? "font-bold text-foreground"
                              : "font-semibold text-foreground/90 group-hover:text-foreground",
                          )}
                        >
                          {thread.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[11px]",
                            hasUnread
                              ? "font-semibold text-primary"
                              : "font-normal text-muted-foreground/80",
                          )}
                        >
                          {formatLastMessageTime(thread.lastMessageTime)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-xs leading-relaxed",
                            hasUnread
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {thread.lastMessage || (
                            <span className="italic text-muted-foreground/60">No messages yet</span>
                          )}
                        </p>

                        {hasUnread ? (
                          <StatusBadge
                            aria-label={`${thread.unreadCount} unread ${
                              thread.unreadCount === 1 ? "message" : "messages"
                            }`}
                            tone="primary"
                            size="sm"
                            className="font-bold shadow-xs"
                          >
                            {thread.unreadCount}
                          </StatusBadge>
                        ) : null}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
                          {thread.kind === "channel" ? (
                            <>
                              <Hash className="size-2.5" /> Class channel
                            </>
                          ) : (
                            <>
                              <User className="size-2.5" /> Direct message
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )

  const workspace = (
    <ResponsiveSplitView
      listLabel="Conversations"
      detailLabel="Conversation detail"
      list={list}
      emptyDetail={
        <div className="flex h-full min-h-[28rem] flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-xs">
            <MessageSquare className="size-8 text-primary" />
            <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-card border border-primary/30 text-primary shadow-2xs">
              <Sparkles className="size-3" />
            </div>
          </div>
          <h3 className="text-base font-bold tracking-tight text-foreground">
            Select a conversation
          </h3>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Choose a message thread from the left to read and reply, or start a brand new conversation.
          </p>
          <div className="mt-5">
            {newConversation}
          </div>
        </div>
      }
      className="h-[calc(100dvh-14rem)]"
    />
  )

  if (!showHeader) {
    return workspace
  }

  return (
    <PageContainer width="wide">
      <PageHeading
        eyebrow="Communication"
        title="Messages"
        description="Connect with your classmates and teachers."
        actions={newConversation}
      />
      {workspace}
    </PageContainer>
  )
}
