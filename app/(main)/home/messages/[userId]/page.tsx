import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq, and, or, desc } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { messages, user } from "@/db/schema"
import { ChatClient } from "@/components/messages/chat-client"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const { userId: otherUserId } = await params
  const currentUserId = session.user.id

  if (currentUserId === otherUserId) {
    redirect("/home/messages")
  }

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
    redirect("/home/messages")
  }

  // Get all messages between current user and other user
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
    .where(
      or(
        and(eq(messages.senderId, currentUserId), eq(messages.receiverId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, currentUserId)),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(100)

  const mappedMessages = messagesList
    .reverse() // Reverse to show oldest first
    .map((msg) => ({
      ...msg,
      createdAt: msg.createdAt?.toISOString() ?? "",
      media: msg.media ? (typeof msg.media === 'string' ? JSON.parse(msg.media) : msg.media) : null,
    }))

  return (
    <ChatClient
      messages={mappedMessages}
      currentUserId={currentUserId}
      otherUser={otherUser[0]}
    />
  )
}

