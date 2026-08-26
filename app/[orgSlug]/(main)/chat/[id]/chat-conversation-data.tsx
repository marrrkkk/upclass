import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ChatPageView, type ChatInitialMessage } from "@/components/ai/chat-page-view"
import { getConversation, listMessagesPage } from "@/lib/ai/conversations"
import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"

export async function ChatConversationData({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const { orgSlug, id } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/sign-in")

  const membership = await getOrganizationMembership(session.user.id, orgSlug)
  if (!membership) notFound()

  const conversation = await getConversation(id)
  if (
    !conversation ||
    conversation.userId !== session.user.id ||
    conversation.orgId !== membership.orgId
  ) {
    notFound()
  }

  const page = await listMessagesPage(conversation.id, { limit: 50 })
  const initialMessages: ChatInitialMessage[] = page.messages.map((message) => {
    const metadata = message.metadata ?? {}
    return {
      id: message.id,
      role: message.role === "user" ? "user" : "assistant",
      content: message.content,
      status: message.status,
      errorReason:
        typeof metadata.errorReason === "string" ? metadata.errorReason : undefined,
      structuredCards: Array.isArray(metadata.structuredOutputs)
        ? metadata.structuredOutputs
        : undefined,
      actionProposals: Array.isArray(metadata.actionProposals)
        ? metadata.actionProposals
        : undefined,
    }
  })

  return (
    <ChatPageView
      conversationId={conversation.id}
      surface={conversation.surface}
      entityId={conversation.entityId}
      initialMessages={initialMessages}
    />
  )
}