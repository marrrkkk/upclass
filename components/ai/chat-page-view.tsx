"use client"

/**
 * Full-page chat wrapper around the shared ChatThread (page variant).
 */
import { ChatThread, type ChatInitialMessage } from "@/components/ai/chat-thread"

export type { ChatInitialMessage } from "@/components/ai/chat-thread"

export function ChatPageView({
  conversationId,
  surface,
  entityId,
  initialMessages,
}: {
  conversationId: string
  surface: "dashboard" | "class" | "resource"
  entityId: string
  initialMessages: ChatInitialMessage[]
}) {
  return (
    <ChatThread
      conversationId={conversationId}
      surface={surface}
      entityId={entityId}
      initialMessages={initialMessages}
      variant="page"
    />
  )
}