import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq, or, desc, inArray } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { messages, user } from "@/db/schema"
import { MessagesClient } from "@/components/messages/messages-client"

export const metadata: Metadata = {
  title: "Messages",
}

export const revalidate = 10 // Revalidate every 10 seconds for messages

export default async function MessagesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const userId = session.user.id

  // Get all unique conversations (messages where user is sender or receiver)
  const allMessages = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      content: messages.content,
      read: messages.read,
      createdAt: messages.createdAt,
      senderName: user.name,
      senderImage: user.image,
    })
    .from(messages)
    .innerJoin(user, eq(messages.senderId, user.id))
    .where(
      or(eq(messages.senderId, userId), eq(messages.receiverId, userId)),
    )
    .orderBy(desc(messages.createdAt))

  // Group by conversation partner
  const conversations = new Map<string, {
    userId: string
    userName: string
    userImage: string | null
    lastMessage: string
    lastMessageTime: string
    unreadCount: number
  }>()

  allMessages.forEach((msg) => {
    const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId
    const existing = conversations.get(otherUserId)

    if (!existing || new Date(msg.createdAt || 0) > new Date(existing.lastMessageTime)) {
      // Get receiver info for conversations where user is sender
      const otherUserInfo = msg.senderId === userId
        ? { name: "User", image: null } // Will need to fetch separately
        : { name: msg.senderName, image: msg.senderImage }

      conversations.set(otherUserId, {
        userId: otherUserId,
        userName: otherUserInfo.name,
        userImage: otherUserInfo.image,
        lastMessage: msg.content,
        lastMessageTime: msg.createdAt?.toISOString() || "",
        unreadCount: msg.receiverId === userId && !msg.read ? 1 : 0,
      })
    } else if (msg.receiverId === userId && !msg.read) {
      existing.unreadCount++
    }
  })

  // Fetch user info for all conversation partners
  const conversationUserIds = Array.from(conversations.keys())
  if (conversationUserIds.length > 0) {
    const userInfos = await db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(user)
      .where(inArray(user.id, conversationUserIds))

    // Update conversations with correct user info
    userInfos.forEach((userInfo) => {
      const conv = conversations.get(userInfo.id)
      if (conv) {
        conv.userName = userInfo.name
        conv.userImage = userInfo.image
      }
    })
  }

  const conversationsList = Array.from(conversations.values())

  return <MessagesClient conversations={conversationsList} userId={userId} />
}

