"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { channelMessages, classChannels, classMembership, messages, user } from "@/db/schema"
import { deliverMessageNotification } from "@/lib/notifications/delivery"
import {
  markConversationAsReadSchema,
  markMessageAsReadSchema,
  messageSearchSchema,
  sendChannelMessageSchema,
  sendMessageSchema,
} from "@/lib/validation/actions"
import { searchMessageThreads } from "@/lib/server/messages"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

export async function sendMessage(
  receiverId: string,
  content: string,
  media?: string, // JSON string array of media files
  url?: string,
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = sendMessageSchema.safeParse({ receiverId, content, media, url })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid message" }
  }

  const messageInput = parsed.data

  if (session.user.id === messageInput.receiverId) {
    return { success: false, error: "Cannot send message to yourself" }
  }

  // Verify receiver exists and check notification settings
  const receiver = await db
    .select({
      id: user.id,
      email: user.email,
      messageNotifications: user.messageNotifications,
      emailNotifications: user.emailNotifications,
      pushNotifications: user.pushNotifications,
    })
    .from(user)
    .where(eq(user.id, messageInput.receiverId))
    .limit(1)

  if (receiver.length === 0) {
    return { success: false, error: "Receiver not found" }
  }

  try {
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      senderId: session.user.id,
      receiverId: messageInput.receiverId,
      content: messageInput.content,
      media: messageInput.media || null,
      url: null, // URLs are now detected in content
      read: false,
    })

    await deliverMessageNotification({
      recipient: {
        userId: receiver[0].id,
        email: receiver[0].email,
        messageNotifications: receiver[0].messageNotifications,
        emailNotifications: receiver[0].emailNotifications,
        pushNotifications: receiver[0].pushNotifications,
      },
      senderName: session.user.name,
      preview: messageInput.content,
    })

    revalidatePath("/messages")
    return { success: true }
  } catch (error) {
    console.error("sendMessage error", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function sendChannelMessage(
  channelId: string,
  content: string,
  media?: string,
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = sendChannelMessageSchema.safeParse({ channelId, content, media })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid message" }
  }

  const channel = await db
    .select({
      id: classChannels.id,
      classId: classChannels.classId,
    })
    .from(classChannels)
    .where(eq(classChannels.id, parsed.data.channelId))
    .limit(1)

  if (!channel.length) {
    return { success: false, error: "Channel not found" }
  }

  const membership = await db
    .select({ id: classMembership.id })
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, channel[0].classId),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (!membership.length) {
    return { success: false, error: "You do not have access to this channel" }
  }

  try {
    await db.insert(channelMessages).values({
      id: crypto.randomUUID(),
      channelId: parsed.data.channelId,
      senderId: session.user.id,
      content: parsed.data.content,
      media: parsed.data.media || null,
      readBy: JSON.stringify([session.user.id]),
    })

    revalidatePath("/messages")
    revalidatePath(`/messages/class/${channel[0].classId}`)
    return { success: true }
  } catch (error) {
    console.error("sendChannelMessage error", error)
    return { success: false, error: "Failed to send channel message" }
  }
}

export async function markMessageAsRead(messageId: string): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = markMessageAsReadSchema.safeParse({ messageId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid message" }
  }

  try {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.id, parsed.data.messageId),
          eq(messages.receiverId, session.user.id),
        ),
      )

    revalidatePath("/messages")
    return { success: true }
  } catch (error) {
    console.error("markMessageAsRead error", error)
    return { success: false, error: "Failed to mark message as read" }
  }
}

export async function markConversationAsRead(otherUserId: string): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = markConversationAsReadSchema.safeParse({ otherUserId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid user" }
  }

  try {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.receiverId, session.user.id),
          eq(messages.senderId, parsed.data.otherUserId),
        ),
      )

    revalidatePath("/messages")
    return { success: true }
  } catch (error) {
    console.error("markConversationAsRead error", error)
    return { success: false, error: "Failed to mark conversation as read" }
  }
}

export async function markChannelAsRead(channelId: string): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const channel = await db
      .select({
        id: classChannels.id,
        classId: classChannels.classId,
      })
      .from(classChannels)
      .where(eq(classChannels.id, channelId))
      .limit(1)

    if (!channel.length) {
      return { success: false, error: "Channel not found" }
    }

    const membership = await db
      .select({ id: classMembership.id })
      .from(classMembership)
      .where(
        and(
          eq(classMembership.classId, channel[0].classId),
          eq(classMembership.userId, session.user.id),
        ),
      )
      .limit(1)

    if (!membership.length) {
      return { success: false, error: "Unauthorized" }
    }

    const unreadMessages = await db
      .select({
        id: channelMessages.id,
        readBy: channelMessages.readBy,
      })
      .from(channelMessages)
      .where(eq(channelMessages.channelId, channelId))

    for (const message of unreadMessages) {
      const readBy = message.readBy ? (JSON.parse(message.readBy) as string[]) : []
      if (readBy.includes(session.user.id)) continue

      await db
        .update(channelMessages)
        .set({
          readBy: JSON.stringify([...readBy, session.user.id]),
        })
        .where(eq(channelMessages.id, message.id))
    }

    revalidatePath("/messages")
    revalidatePath(`/messages/class/${channel[0].classId}`)
    return { success: true }
  } catch (error) {
    console.error("markChannelAsRead error", error)
    return { success: false, error: "Failed to mark channel as read" }
  }
}

export async function searchMessages(query: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" }
  }

  const parsed = messageSearchSchema.safeParse({ query })
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid query" }
  }

  try {
    const results = await searchMessageThreads(session.user.id, parsed.data.query)
    return { success: true as const, results }
  } catch (error) {
    console.error("searchMessages error", error)
    return { success: false as const, error: "Failed to search messages" }
  }
}
