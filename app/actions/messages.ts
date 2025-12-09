"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and, or, desc } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { messages, user } from "@/db/schema"

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

  if (session.user.id === receiverId) {
    return { success: false, error: "Cannot send message to yourself" }
  }

  const trimmedContent = content?.trim() || ""

  // Message must have content or media
  if (!trimmedContent && !media) {
    return { success: false, error: "Message must have content or media" }
  }

  // Verify receiver exists
  const receiver = await db
    .select()
    .from(user)
    .where(eq(user.id, receiverId))
    .limit(1)

  if (receiver.length === 0) {
    return { success: false, error: "Receiver not found" }
  }

  try {
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      senderId: session.user.id,
      receiverId,
      content: trimmedContent || "",
      media: media || null,
      url: null, // URLs are now detected in content
      read: false,
    })

    revalidatePath("/home/messages")
    return { success: true }
  } catch (error) {
    console.error("sendMessage error", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function markMessageAsRead(messageId: string): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.receiverId, session.user.id),
        ),
      )

    revalidatePath("/home/messages")
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

  try {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.receiverId, session.user.id),
          eq(messages.senderId, otherUserId),
        ),
      )

    revalidatePath("/home/messages")
    return { success: true }
  } catch (error) {
    console.error("markConversationAsRead error", error)
    return { success: false, error: "Failed to mark conversation as read" }
  }
}

