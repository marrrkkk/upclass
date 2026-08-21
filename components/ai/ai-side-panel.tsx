"use client"

/**
 * Slide-in assistant panel (Cmd/Ctrl+J). Dual-mode drawer: on mobile it is
 * a fixed right overlay with scrim; on desktop it is an inline flex child
 * that pushes content at `--app-ai-panel-width`. Hosts the conversation history
 * popover with search, inline chat thread, and admin knowledge base.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  createEmptyChat,
  deleteChat,
  resetClassConversationAction,
  resolveClassConversationAction,
} from "@/app/actions/ai"
import { useAiPanel } from "@/components/ai/ai-panel-provider"
import { ChatThread, type ChatInitialMessage } from "@/components/ai/chat-thread"
import { OrgMemoryManager } from "@/components/ai/org-memory-manager"
import { cn } from "@/lib/utils"
import type { OrgRole } from "@/types/organization"
import type { AiSurface } from "@/lib/ai/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  BookOpen,
  ChevronDown,
  Maximize2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

type ConversationRow = {
  id: string
  title: string
  updatedAt: string | null
  messageCount?: number | null
}

function formatRelativeCompact(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 365) return `${days}d`
  const years = Math.floor(days / 365)
  return `${years}y`
}

type GroupedConversations = {
  title: string
  items: ConversationRow[]
}

function groupConversations(conversations: ConversationRow[]): GroupedConversations[] {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const today: ConversationRow[] = []
  const yesterday: ConversationRow[] = []
  const previous7Days: ConversationRow[] = []
  const older: ConversationRow[] = []

  for (const conv of conversations) {
    if (!conv.updatedAt) {
      older.push(conv)
      continue
    }
    const date = new Date(conv.updatedAt)
    if (Number.isNaN(date.getTime())) {
      older.push(conv)
      continue
    }
    const diff = now - date.getTime()
    if (diff < oneDay) {
      today.push(conv)
    } else if (diff < 2 * oneDay) {
      yesterday.push(conv)
    } else if (diff < 7 * oneDay) {
      previous7Days.push(conv)
    } else {
      older.push(conv)
    }
  }

  const groups: GroupedConversations[] = []
  if (today.length > 0) groups.push({ title: "Today", items: today })
  if (yesterday.length > 0) groups.push({ title: "Yesterday", items: yesterday })
  if (previous7Days.length > 0) groups.push({ title: "Previous 7 days", items: previous7Days })
  if (older.length > 0) groups.push({ title: "Older", items: older })

  return groups
}

function rowToInitialMessage(row: {
  id: string
  role: string
  content: string
  status: string
  metadata?: Record<string, unknown>
}): ChatInitialMessage {
  const metadata = row.metadata ?? {}
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    status: (row.status as ChatInitialMessage["status"]) ?? "completed",
    errorReason:
      typeof metadata.errorReason === "string" ? metadata.errorReason : undefined,
    structuredCards: Array.isArray(metadata.structuredOutputs)
      ? metadata.structuredOutputs
      : undefined,
    actionProposals: Array.isArray(metadata.actionProposals)
      ? metadata.actionProposals
      : undefined,
    sourceRefs: Array.isArray(metadata.sourceRefs) ? metadata.sourceRefs : undefined,
    runId: typeof metadata.runId === "string" ? metadata.runId : undefined,
  }
}

export function AiSidePanel({
  organizationRole,
}: {
  organizationRole?: OrgRole | null
}) {
  const {
    open,
    setOpen,
    seed,
    clearSeed,
    activeConversationId,
    setActiveConversationId,
    draftConversation,
    setHistoryLoaded,
  } = useAiPanel()
  const pathname = usePathname()
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ConversationRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMemory, setShowMemory] = useState(false)
  const [showLauncher, setShowLauncher] = useState(false)
  const [threadMessages, setThreadMessages] = useState<ChatInitialMessage[]>([])
  const [threadReadyFor, setThreadReadyFor] = useState<string | null>(null)
  const [threadInput, setThreadInput] = useState("")
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const openedInitialChatRef = useRef(false)
  const conversationRequestRef = useRef(0)
  const historyRequestRef = useRef(0)
  const previousSeedKeyRef = useRef<string | null>(null)
  const toast = useToast()

  const orgSlug = pathname.split("/").filter(Boolean)[0] ?? ""
  const isAdmin = organizationRole === "owner" || organizationRole === "admin"
  const mode: "launcher" | "thread" =
    showLauncher ? "launcher" : activeConversationId || draftConversation ? "thread" : "launcher"

  useEffect(() => {
    const nextSeedKey = seed ? `${seed.surface}:${seed.entityId}` : null
    if (previousSeedKeyRef.current === nextSeedKey) return
    previousSeedKeyRef.current = nextSeedKey
    if (!nextSeedKey) return
    openedInitialChatRef.current = false
    conversationRequestRef.current += 1
    setConversations([])
    setThreadMessages([])
    setThreadReadyFor(null)
    setThreadInput("")
    setQueuedMessage(null)
    setShowLauncher(false)
  }, [seed?.entityId, seed?.surface])

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!orgSlug) return
    const requestId = ++historyRequestRef.current
    setLoading(true)
    try {
      const params = new URLSearchParams({
        orgSlug,
        surface: seed ? seed.surface : "dashboard",
        limit: "50",
      })
      if (seed) params.set(seed.surface === "class" ? "classId" : seed.surface === "resource" ? "resourceId" : "studyId", seed.entityId)
      const response = await fetch(`/api/ai/conversations?${params.toString()}`, {
        cache: "no-store",
      })
      if (!response.ok) return
      const data = (await response.json()) as { conversations?: ConversationRow[] }
      if (historyRequestRef.current !== requestId) return
      setConversations(data.conversations ?? [])
      setHistoryLoaded(true)
    } catch {
      // Keep whatever we have.
    } finally {
      if (historyRequestRef.current === requestId) setLoading(false)
    }
  }, [orgSlug, seed, setHistoryLoaded])

  // Load the active conversation's history when entering thread mode.
  useEffect(() => {
    if (!activeConversationId) return
    if (activeConversationId.startsWith("temp-")) return
    let cancelled = false
    fetch(`/api/ai/conversations/${activeConversationId}/messages?limit=50`, {
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load messages")
        return response.json() as Promise<{
          messages: Array<{
            id: string
            role: string
            content: string
            status: string
            metadata?: Record<string, unknown>
          }>
        }>
      })
      .then((page) => {
        if (cancelled) return
        setThreadMessages(page.messages.map(rowToInitialMessage))
        setThreadReadyFor(activeConversationId)
      })
      .catch(() => {
        if (cancelled) return
        setThreadMessages([])
        setThreadReadyFor(activeConversationId)
      })
    return () => {
      cancelled = true
    }
  }, [activeConversationId])

  const handleNewChat = useCallback(() => {
    const requestId = ++conversationRequestRef.current
    const tempId = `temp-${crypto.randomUUID()}`
    setActiveConversationId(tempId)
    setThreadMessages([])
    setThreadReadyFor(tempId)
    setThreadInput("")
    setQueuedMessage(null)
    setShowLauncher(false)

    const surface: AiSurface = seed
      ? seed.surface
      : "dashboard"
    const entityId = seed?.entityId ?? "dashboard"

    void (async () => {
      try {
        const result = seed?.surface === "class"
          ? await resolveClassConversationAction({ orgSlug, classId: seed.entityId })
          : await createEmptyChat({ orgSlug, surface, entityId })
        
        if (result.success && result.conversationId) {
          if (conversationRequestRef.current !== requestId) return
          setActiveConversationId(result.conversationId)
          setThreadReadyFor(result.conversationId)
          // Refresh conversation list in background
          void loadConversations()
        } else if (!result.success) {
          if (conversationRequestRef.current !== requestId) return
          toast.error("Could not start a chat", result.error)
          setActiveConversationId(null)
        }
      } catch {
        if (conversationRequestRef.current !== requestId) return
        toast.error("Could not start a chat")
        setActiveConversationId(null)
      }
    })()
  }, [seed, orgSlug, setActiveConversationId, toast, loadConversations])

  useLayoutEffect(() => {
    if (!open || openedInitialChatRef.current || activeConversationId || draftConversation) return
    openedInitialChatRef.current = true
    handleNewChat()
  }, [open, activeConversationId, draftConversation, handleNewChat])

  const handleReset = useCallback(async () => {
    if (!seed || resetting) return
    setResetting(true)
    try {
      const result = await resetClassConversationAction({
        orgSlug,
        classId: seed.entityId,
      })
      if (result.success && result.conversationId) {
        setActiveConversationId(result.conversationId)
      } else if (!result.success) {
        toast.error("Could not reset the class conversation", result.error)
      }
    } catch {
      toast.error("Could not reset the class conversation")
    } finally {
      setResetting(false)
    }
  }, [seed, resetting, orgSlug, setActiveConversationId, toast])

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete || deleting) return
    setDeleting(true)
    try {
      const result = await deleteChat({ orgSlug, conversationId: confirmDelete.id })
      if (result.success) {
        if (activeConversationId === confirmDelete.id) {
          setActiveConversationId(null)
        }
        setConversations((previous) =>
          previous.filter((row) => row.id !== confirmDelete.id),
        )
      } else {
        toast.error("Could not delete the conversation", result.error)
      }
    } catch {
      toast.error("Could not delete the conversation")
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  // Close the panel on navigation (state is preserved in the provider).
  const previousPathnameRef = useRef(pathname)
  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname
      setOpen(false)
    }
  }, [pathname, setOpen])

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => {
      returnFocusRef.current?.focus()
    }
  }, [open])

  // Scroll lock only for the mobile overlay (desktop pushes content).
  useEffect(() => {
    if (!open) return
    if (!window.matchMedia("(max-width: 767px)").matches) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, setOpen])

  const currentConversation = conversations.find((c) => c.id === activeConversationId)
  const activeTitle = currentConversation?.title || "New conversation"

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const query = searchQuery.trim().toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(query))
  }, [conversations, searchQuery])

  const groupedSections = useMemo(() => {
    return groupConversations(filteredConversations)
  }, [filteredConversations])

  if (!orgSlug) return null

  const expandHref = activeConversationId
    ? activeConversationId.startsWith("temp-")
      ? `/${orgSlug}/chat/new`
      : `/${orgSlug}/chat/${activeConversationId}`
    : `/${orgSlug}/chat/new`

  return (
    <>
      <aside
        id="assistant-panel"
        ref={panelRef}
        aria-label="Assistant panel"
        aria-hidden={!open}
        data-state={open ? "open" : "closed"}
        tabIndex={-1}
        className="ai-side-panel fixed inset-y-0 right-0 z-[45] flex h-full w-[min(20rem,88vw)] flex-col border-l border-hairline bg-card shadow-e4 md:relative md:inset-auto md:z-auto md:h-full md:w-[var(--app-ai-panel-width)] md:shrink-0 md:shadow-none"
      >
        {/* Top Navbar Header - Aligned height & horizontal border with main navbar */}
        <div className="flex h-[var(--app-header-height)] shrink-0 items-center justify-between gap-2 border-b border-hairline/80 px-3 bg-card">
          {/* History Popover Dropdown Trigger */}
          <Popover
            open={historyOpen}
            onOpenChange={(nextOpen) => {
              setHistoryOpen(nextOpen)
              if (nextOpen) {
                void loadConversations()
              } else {
                setSearchQuery("")
              }
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="View conversation history"
                className="touch-target focus-ring group flex min-w-0 max-w-[13.5rem] items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {activeTitle}
                </span>
                <ChevronDown
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-foreground"
                  aria-hidden="true"
                />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={8}
              onFocusOutside={(event) => event.preventDefault()}
              className="w-[18.5rem] rounded-2xl border border-hairline bg-card p-3 shadow-e3"
            >
              {/* Search input */}
              <div className="relative mb-2.5">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 rounded-lg border-hairline bg-surface-subtle/70 pl-8 pr-2.5 type-small text-foreground placeholder:text-muted-foreground/70 focus:bg-card"
                />
              </div>

              {/* Grouped conversations list */}
              <div className="max-h-[16rem] space-y-3 overflow-y-auto pr-0.5">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner className="size-4" aria-hidden="true" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <p className="px-2 py-4 text-center type-caption text-muted-foreground">
                    {searchQuery ? "No matching conversations" : "No conversation history yet"}
                  </p>
                ) : (
                  groupedSections.map((section) => (
                    <div key={section.title} className="space-y-1">
                      <p className="px-2 py-0.5 type-caption font-semibold text-foreground-muted">
                        {section.title}
                      </p>
                      <ul className="space-y-0.5">
                        {section.items.map((conv) => {
                          const active = conv.id === activeConversationId
                          return (
                            <li
                              key={conv.id}
                              className="group relative flex items-center justify-between rounded-lg transition-colors hover:bg-surface-hover"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryOpen(false)
                                  setThreadInput("")
                                  setShowLauncher(false)
                                  setActiveConversationId(conv.id)
                                }}
                                className={cn(
                                  "flex min-w-0 flex-1 items-center justify-between px-2.5 py-1.5 text-left type-small transition-colors",
                                  active ? "font-semibold text-primary-text" : "text-foreground",
                                )}
                              >
                                <span className="truncate pr-2">{conv.title}</span>
                                <span className="shrink-0 type-caption tabular-nums text-foreground-muted">
                                  {formatRelativeCompact(conv.updatedAt)}
                                </span>
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmDelete(conv)
                                }}
                                aria-label={`Delete ${conv.title}`}
                                className="mr-1 size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive hover:bg-destructive-surface"
                                title="Delete"
                              >
                                <Trash2 className="size-3" aria-hidden="true" />
                              </Button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>

              {/* Admin Knowledge Base Toggle */}
              {isAdmin ? (
                <div className="mt-2 border-t border-hairline pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMemory((v) => !v)
                      setShowLauncher(true)
                    }}
                    className="w-full justify-start gap-2 type-caption font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                    aria-label={showMemory ? "Hide knowledge base" : "Manage knowledge base"}
                  >
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    <span>{showMemory ? "Hide" : "Manage"} knowledge base</span>
                  </Button>
                </div>
              ) : null}

              {/* Bottom '+ New conversation' Button */}
              <button
                type="button"
                onClick={handleNewChat}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface-subtle/60 py-2 type-small font-medium text-foreground transition-all duration-150 hover:border-hairline/80 hover:bg-surface-hover"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>New conversation</span>
              </button>
            </PopoverContent>
          </Popover>

          {/* Right Action Icons: [+] [↗] [×] */}
          <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
            {mode === "thread" && seed?.surface === "class" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={resetting}
                className="h-7 px-2 type-caption"
              >
                Start fresh
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleNewChat}
              className="touch-target rounded-lg hover:bg-surface-hover hover:text-foreground"
              aria-label="Start a new chat"
              title="New conversation"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              asChild
              className="touch-target rounded-lg hover:bg-surface-hover hover:text-foreground"
            >
              <Link
                href={expandHref}
                onClick={() => setOpen(false)}
                aria-label="Open chat in full page"
                title="Expand"
              >
                <Maximize2 className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setOpen(false)}
              className="touch-target rounded-lg hover:bg-surface-hover hover:text-foreground"
              aria-label="Close assistant panel"
              title="Close"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Panel Body: Chat Thread or Knowledge Base Launcher */}
        {mode === "thread" && activeConversationId ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {seed?.surface === "resource" ? (
              <div className="shrink-0 border-b border-hairline/80 bg-primary/5 px-4 py-2.5">
                <p className="type-caption font-medium text-muted-foreground">Sharing resource</p>
                <p className="truncate type-small font-semibold text-foreground" title={seed.label}>{seed.label}</p>
              </div>
            ) : null}
            {!activeConversationId.startsWith("temp-") && threadReadyFor !== activeConversationId ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner className="size-4" aria-hidden="true" />
              </div>
            ) : (
              <ChatThread
                key={activeConversationId}
                conversationId={activeConversationId}
                surface={
                  seed
                    ? seed.surface
                    : "dashboard"
                }
                entityId={seed ? seed.entityId : "dashboard"}
                initialMessages={threadMessages}
                variant="panel"
                conversationReady={!activeConversationId.startsWith("temp-")}
                draftInput={threadInput}
                onDraftInputChange={setThreadInput}
                queuedMessage={queuedMessage}
                onQueueMessage={setQueuedMessage}
                onQueuedMessageSent={() => setQueuedMessage(null)}
                contextLabel={seed ? seed.label : undefined}
              />
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
            {seed ? (
              <div className="mb-3 rounded-[var(--radius-container)] border border-hairline bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="type-caption font-medium uppercase text-muted-foreground">
                      {seed.surface === "resource" ? "Asking about resource" : seed.surface === "study" ? "Asking about study space" : "Asking about class"}
                    </p>
                    <p className="truncate type-small font-semibold">{seed.label}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={clearSeed}
                    aria-label="Clear context"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleNewChat}
                    className="flex-1"
                  >
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {seed.surface === "resource" ? "Ask about this resource" : seed.surface === "study" ? "Ask about this study space" : "Ask about this class"}
                  </Button>
                  {seed.surface === "class" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleReset}
                      disabled={resetting}
                    >
                      Start fresh
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            {isAdmin ? (
              <div className="space-y-3">
                {showMemory ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="type-small font-semibold text-foreground">Knowledge Base</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowMemory(false)
                          setShowLauncher(false)
                        }}
                      >
                        Back to chat
                      </Button>
                    </div>
                    <OrgMemoryManager orgSlug={orgSlug} />
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMemory(true)}
                    className="w-full justify-start gap-2 text-muted-foreground"
                    aria-label="Manage knowledge base"
                  >
                    <BookOpen className="size-4" aria-hidden="true" />
                    Manage knowledge base
                  </Button>
                )}
              </div>
            ) : null}

            {!seed && !showMemory ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNewChat}
                  className="w-full"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Start conversation
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[44] bg-overlay md:hidden"
          aria-label="Close assistant panel overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{confirmDelete?.title}&quot; and its messages will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} disabled={deleting}>
              {deleting ? (
                <Spinner className="size-3.5" aria-hidden="true" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
