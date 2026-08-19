import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq, and, or, desc } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { messages, user } from "@/db/schema"
import { ChatClient } from "@/components/messages/chat-client"
import { assertSameOrganization, ensureDirectConversation } from "@/lib/server/messages"

export async function MessageChatData({
  params,
}: {
  params: Promise<{ orgSlug: string; userId: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const { orgSlug, userId: otherUserId } = await params
  const currentUserId = session.user.id

  if (currentUserId === otherUserId) {
    redirect(`/${orgSlug}/messages`)
  }

  const organization = await assertSameOrganization(currentUserId, otherUserId, orgSlug)
  if (!organization) redirect(`/${orgSlug}/messages`)
  const conversation = await ensureDirectConversation(currentUserId, otherUserId, organization.orgId)

  // Get other user info
  const otherUser = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      email: user.email,
    })
    .from(user)
    .where(eq(user.id, otherUserId))
    .limit(1)

  if (otherUser.length === 0) {
    redirect(`/${orgSlug}/messages`)
  }

  // Load newest page; older history loads by cursor.
  const messagesList = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      content: messages.content,
      media: messages.media,
      url: messages.url,
      read: messages.read,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(conversation
      ? eq(messages.conversationId, conversation.id)
      : or(
          and(eq(messages.senderId, currentUserId), eq(messages.receiverId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, currentUserId)),
        ))
    .orderBy(desc(messages.createdAt))
    .limit(51)

  const hasMore = messagesList.length > 50
  const mappedMessages = messagesList
    .slice(0, 50)
    .reverse()
    .map((msg) => ({
      ...msg,
      createdAt: msg.createdAt?.toISOString() ?? "",
      media: msg.media ? (typeof msg.media === 'string' ? JSON.parse(msg.media) : msg.media) : null,
    }))

  return (
    <ChatClient
      messages={mappedMessages}
      conversationId={conversation.id}
      orgSlug={orgSlug}
      hasMore={hasMore}
      currentUserId={currentUserId}
      otherUser={otherUser[0]}
    />
  )
}
