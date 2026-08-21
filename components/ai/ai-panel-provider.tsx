"use client"

/**
 * Global AI panel state: open/closed, Cmd/Ctrl+J toggle, optional class
 * context seed, and the session-only active conversation.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

const PANEL_STORAGE_KEY = "upclass:ai-panel-open"

export type AiPanelSeed = {
  surface: "class" | "resource" | "study"
  entityId: string
  label: string
}

type DraftConversation = {
  id: string // client-side temporary ID
  messages: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    status: "completed" | "generating" | "failed"
  }>
  draftInput: string
}

type AiPanelContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  seed: AiPanelSeed | null
  openFor: (seed: AiPanelSeed) => void
  setContext: (seed: AiPanelSeed) => void
  clearSeed: () => void
  activeConversationId: string | null
  setActiveConversationId: (conversationId: string | null) => void
  draftConversation: DraftConversation | null
  setDraftConversation: (draft: DraftConversation | null) => void
  createDraftConversation: () => DraftConversation
  historyLoaded: boolean
  setHistoryLoaded: (loaded: boolean) => void
}

const AiPanelContext = createContext<AiPanelContextValue | null>(null)

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function AiPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(PANEL_STORAGE_KEY) === "1"
  })
  const [seed, setSeed] = useState<AiPanelSeed | null>(null)
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null)
  const [draftConversation, setDraftConversation] = useState<DraftConversation | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    try {
      window.localStorage.setItem(PANEL_STORAGE_KEY, next ? "1" : "0")
    } catch {
      // Storage unavailable — panel still works for the session.
    }
  }, [])

  const toggle = useCallback(() => {
    setOpenState((current) => {
      const next = !current
      try {
        window.localStorage.setItem(PANEL_STORAGE_KEY, next ? "1" : "0")
      } catch {
        // Ignore storage failures.
      }
      return next
    })
  }, [])

  const openFor = useCallback((nextSeed: AiPanelSeed) => {
    setSeed(nextSeed)
    setActiveConversationIdState(null)
    setDraftConversation(null)
    setOpenState(true)
    try {
      window.localStorage.setItem(PANEL_STORAGE_KEY, "1")
    } catch {
      // Ignore storage failures.
    }
  }, [])

  const setContext = useCallback((nextSeed: AiPanelSeed) => {
    setSeed((current) => {
      if (current?.surface === nextSeed.surface && current.entityId === nextSeed.entityId && current.label === nextSeed.label) return current
      setActiveConversationIdState(null)
      setDraftConversation(null)
      setHistoryLoaded(false)
      return nextSeed
    })
  }, [])

  const clearSeed = useCallback(() => {
    setSeed(null)
  }, [])

  const setActiveConversationId = useCallback((conversationId: string | null) => {
    setActiveConversationIdState(conversationId)
  }, [])

  const createDraftConversation = useCallback(() => {
    const draftId = `draft-${crypto.randomUUID()}`
    const draft: DraftConversation = {
      id: draftId,
      messages: [],
      draftInput: "",
    }
    setDraftConversation(draft)
    setActiveConversationIdState(null) // Clear active conversation when creating draft
    return draft
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        if (isTypingTarget(event.target)) return
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggle])

  return (
    <AiPanelContext.Provider
      value={{
        open,
        setOpen,
        toggle,
        seed,
        openFor,
        setContext,
        clearSeed,
        activeConversationId,
        setActiveConversationId,
        draftConversation,
        setDraftConversation,
        createDraftConversation,
        historyLoaded,
        setHistoryLoaded,
      }}
    >
      {children}
    </AiPanelContext.Provider>
  )
}

export function useAiPanel(): AiPanelContextValue {
  const context = useContext(AiPanelContext)
  if (!context) {
    throw new Error("useAiPanel must be used within AiPanelProvider")
  }
  return context
}
