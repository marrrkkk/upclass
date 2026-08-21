"use server"

import { headers } from "next/headers"
import { eq, and, desc, sql } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import {
  channelMemberState,
  channelMessages,
  classChannels,
  classMembership,
  classes,
  directConversationMembers,
  directConversations,
  messageNotificationOutbox,
  messages,
  organizations,
  orgMembership,
  user,
} from "@/db/schema"
import { revalidateClassOrg, revalidateUserOrgs } from "@/lib/server/revalidate"
import {
  markConversationAsReadSchema,
  markMessageAsReadSchema,
  messageSearchSchema,
  sendChannelMessageSchema,
  sendMessageSchema,
} from "@/lib/validation/actions"
import {
  assertSameOrganization,
  ensureDirectConversation,
  getOrgIdForSlug,
  resolveDirectConversation,
  searchMessageThreads,
} from "@/lib/server/messages"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

type MessageSendInput = {
  orgSlug?: string
  receiverId: string
  content: string
  media?: string
  url?: string
  clientMessageId?: string
}

type ChannelSendInput = {
  orgSlug?: string
  channelId: string
  content: string
  media?: string
  clientMessageId?: string
}

type PersistedMessage = {
  id: string
  clientMessageId: string
  conversationId?: string | null
  channelId?: string
  senderId: string
  receiverId?: string
  content: string
  media: string | null
  createdAt: string
}

type SendResponse =
  | { success: true; message: PersistedMessage; deduplicated: boolean }
  | { success: true }
  | { success: false; error: string }

function isMessageSendInput(value: string | MessageSendInput): value is MessageSendInput {
  return typeof value !== "string"
}

export async function sendMessage(
  inputOrReceiverId: MessageSendInput | string,
  legacyContent?: string,
  legacyMedia?: string,
  legacyUrl?: string,
): Promise<SendResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const input: MessageSendInput = isMessageSendInput(inputOrReceiverId)
    ? inputOrReceiverId
    : {
        receiverId: inputOrReceiverId,
        content: legacyContent ?? "",
        media: legacyMedia,
        url: legacyUrl,
      }
  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid message" }
  }

  const messageInput = parsed.data

  if (session.user.id === messageInput.receiverId) {
    return { success: false, error: "Cannot send message to yourself" }
  }

  const legacyCall = !isMessageSendInput(inputOrReceiverId)
  const sharedOrg = legacyCall
    ? null
    : await assertSameOrganization(session.user.id, messageInput.receiverId, messageInput.orgSlug)
  if (!legacyCall && !sharedOrg) {
    return { success: false, error: "Direct messages require shared organization" }
  }

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
    if (legacyCall) {
      await db.insert(messages).values({
        id: crypto.randomUUID(),
        senderId: session.user.id,
        receiverId: messageInput.receiverId,
        content: messageInput.content,
        media: messageInput.media || null,
        url: messageInput.url || null,
        read: false,
      })
      await revalidateUserOrgs(session.user.id, ["messages"])
      return { success: true }
    }
    const conversation = await ensureDirectConversation(
      session.user.id,
      messageInput.receiverId,
      sharedOrg!.orgId,
    )
    if (!conversation) return { success: false, error: "Failed to create conversation" }

    const clientMessageId = messageInput.clientMessageId || crypto.randomUUID()
    const result = await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversation.id),
            eq(messages.clientMessageId, clientMessageId),
          ),
        )
        .limit(1)
      if (existing[0]) return { row: existing[0], deduplicated: true }

      const [row] = await tx
        .insert(messages)
        .values({
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          clientMessageId,
          senderId: session.user.id,
          receiverId: messageInput.receiverId,
          content: messageInput.content,
          media: messageInput.media || null,
          url: messageInput.url || null,
          read: false,
        })
        .returning()
      if (!row) throw new Error("Message insert failed")

      await tx
        .update(directConversations)
        .set({
          lastMessageId: row.id,
          lastMessageAt: row.createdAt,
          lastMessagePreview: row.content.slice(0, 160),
          updatedAt: new Date(),
        })
        .where(eq(directConversations.id, conversation.id))

      if (receiver[0].messageNotifications) {
        await tx
          .insert(messageNotificationOutbox)
          .values({
            id: crypto.randomUUID(),
            messageId: row.id,
            recipientId: receiver[0].id,
            channel: "email",
          })
          .onConflictDoNothing()
      }
      return { row, deduplicated: false }
    })

    await revalidateUserOrgs(session.user.id, ["messages"])
    if (!isMessageSendInput(inputOrReceiverId)) return { success: true }
    return {
      success: true,
      deduplicated: result.deduplicated,
      message: {
        id: result.row.id,
        clientMessageId: result.row.clientMessageId || clientMessageId,
        conversationId: result.row.conversationId,
        senderId: result.row.senderId,
        receiverId: result.row.receiverId,
        content: result.row.content,
        media: result.row.media,
        createdAt: result.row.createdAt.toISOString(),
      },
    }
  } catch (error) {
    console.error("sendMessage error", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function sendChannelMessage(
  inputOrChannelId: ChannelSendInput | string,
  legacyContent?: string,
  legacyMedia?: string,
): Promise<SendResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const input: ChannelSendInput = typeof inputOrChannelId === "string"
    ? { channelId: inputOrChannelId, content: legacyContent ?? "", media: legacyMedia }
    : inputOrChannelId
  const parsed = sendChannelMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid message" }
  }

  const channel = await db
    .select({
      id: classChannels.id,
      classId: classChannels.classId,
      orgSlug: organizations.slug,
      orgId: organizations.id,
    })
    .from(classChannels)
    .innerJoin(classes, eq(classes.id, classChannels.classId))
    .innerJoin(organizations, eq(organizations.id, classes.orgId))
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
    const clientMessageId = parsed.data.clientMessageId || crypto.randomUUID()
    const result = await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(channelMessages)
        .where(
          and(
            eq(channelMessages.channelId, parsed.data.channelId),
            eq(channelMessages.clientMessageId, clientMessageId),
          ),
        )
        .limit(1)
      if (existing[0]) return { row: existing[0], deduplicated: true }

      const [row] = await tx
        .insert(channelMessages)
        .values({
          id: crypto.randomUUID(),
          clientMessageId,
          channelId: parsed.data.channelId,
          senderId: session.user.id,
          content: parsed.data.content,
          media: parsed.data.media || null,
          readBy: JSON.stringify([session.user.id]),
        })
        .returning()
      if (!row) throw new Error("Channel message insert failed")

      await tx
        .update(classChannels)
        .set({
          lastMessageId: row.id,
          lastMessageAt: row.createdAt,
          lastMessagePreview: row.content.slice(0, 160),
        })
        .where(eq(classChannels.id, parsed.data.channelId))
      return { row, deduplicated: false }
    })

    await revalidateClassOrg(channel[0].classId, [
      "messages",
      `messages/class/${channel[0].classId}`,
    ])
    if (typeof inputOrChannelId === "string") return { success: true }
    return {
      success: true,
      deduplicated: result.deduplicated,
      message: {
        id: result.row.id,
        clientMessageId: result.row.clientMessageId || clientMessageId,
        channelId: result.row.channelId,
        senderId: result.row.senderId,
        content: result.row.content,
        media: result.row.media,
        createdAt: result.row.createdAt.toISOString(),
      },
    }
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

    await revalidateUserOrgs(session.user.id, ["messages"])
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
    const conversation = await resolveDirectConversation(session.user.id, parsed.data.otherUserId)
    if (conversation) {
      const [latest] = await db
        .select({ id: messages.id, createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(1)
      if (latest) {
        await db
          .insert(directConversationMembers)
          .values({
            conversationId: conversation.id,
            userId: session.user.id,
            lastReadCreatedAt: latest.createdAt,
            lastReadMessageId: latest.id,
          })
          .onConflictDoUpdate({
            target: [directConversationMembers.conversationId, directConversationMembers.userId],
            set: {
              lastReadCreatedAt: latest.createdAt,
              lastReadMessageId: latest.id,
              updatedAt: new Date(),
            },
          })
      }
    }
    await db
      .update(messages)
      .set({ read: true })
      .where(and(eq(messages.receiverId, session.user.id), eq(messages.senderId, parsed.data.otherUserId)))

    await revalidateUserOrgs(session.user.id, ["messages"])
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

    const [latest] = await db
      .select({ id: channelMessages.id, createdAt: channelMessages.createdAt })
      .from(channelMessages)
      .where(eq(channelMessages.channelId, channelId))
      .orderBy(desc(channelMessages.createdAt), desc(channelMessages.id))
      .limit(1)
    if (latest) {
      await db
        .insert(channelMemberState)
        .values({
          channelId,
          userId: session.user.id,
          lastReadCreatedAt: latest.createdAt,
          lastReadMessageId: latest.id,
        })
        .onConflictDoUpdate({
          target: [channelMemberState.channelId, channelMemberState.userId],
          set: {
            lastReadCreatedAt: latest.createdAt,
            lastReadMessageId: latest.id,
            updatedAt: new Date(),
          },
        })
    }

    await revalidateClassOrg(channel[0].classId, [
      "messages",
      `messages/class/${channel[0].classId}`,
    ])
    return { success: true }
  } catch (error) {
    console.error("markChannelAsRead error", error)
    return { success: false, error: "Failed to mark channel as read" }
  }
}

export async function searchMessages(query: string, orgSlug: string) {
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
    const results = await searchMessageThreads(session.user.id, parsed.data.query, orgSlug)
    return { success: true as const, results }
  } catch (error) {
    console.error("searchMessages error", error)
    return { success: false as const, error: "Failed to search messages" }
  }
}
