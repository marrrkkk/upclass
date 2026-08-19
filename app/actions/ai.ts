"use server"

/**
 * Server actions for the AI assistant surfaces.
 */
import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { aiConversations } from "@/db/schema"
import { auth } from "@/lib/auth"
import {
  createConversation,
  getOrCreateDefaultClassConversation,
} from "@/lib/ai/conversations"
import { getOrganizationMembership } from "@/lib/org-validation"
import { revalidateOrg } from "@/lib/server/revalidate"
import type { AiSurface } from "@/lib/ai/types"

export type AiActionResponse =
  | { success: true; conversationId?: string }
  | { success: false; error: string }

async function requireOrgUser(
  orgSlug: string,
): Promise<{ userId: string; orgId: string } | { error: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return { error: "Unauthorized" }

  const membership = await getOrganizationMembership(session.user.id, orgSlug)
  if (!membership) return { error: "You do not have access to this organization" }

  return { userId: session.user.id, orgId: membership.orgId }
}

/** Start a new chat with the first message (dashboard surface). */
export async function startNewChat(params: {
  orgSlug: string
  surface: AiSurface
  entityId: string
  message: string
}): Promise<AiActionResponse> {
  const user = await requireOrgUser(params.orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  const content = params.message?.trim()
  if (!content) return { success: false, error: "Message is required" }
  if (content.length > 6_000) return { success: false, error: "Message is too long" }

  try {
    const conversation = await createConversation({
      userId: user.userId,
      orgId: user.orgId,
      surface: params.surface,
      entityId: params.entityId,
      firstMessage: content,
    })
    return { success: true, conversationId: conversation.id }
  } catch (error) {
    console.error("startNewChat error:", error)
    return { success: false, error: "Failed to start a new chat" }
  }
}

/** Create an empty chat (dashboard surface). */
export async function createEmptyChat(params: {
  orgSlug: string
  surface: AiSurface
  entityId: string
}): Promise<AiActionResponse> {
  const user = await requireOrgUser(params.orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  try {
    const conversation = await createConversation({
      userId: user.userId,
      orgId: user.orgId,
      surface: params.surface,
      entityId: params.entityId,
    })
    return { success: true, conversationId: conversation.id }
  } catch (error) {
    console.error("createEmptyChat error:", error)
    return { success: false, error: "Failed to create a chat" }
  }
}

/** Delete a chat the user owns. */
export async function deleteChat(params: {
  orgSlug: string
  conversationId: string
}): Promise<AiActionResponse> {
  const user = await requireOrgUser(params.orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  try {
    const deleted = await db
      .delete(aiConversations)
      .where(
        and(
          eq(aiConversations.id, params.conversationId),
          eq(aiConversations.userId, user.userId),
          eq(aiConversations.orgId, user.orgId),
        ),
      )
      .returning({ id: aiConversations.id })

    if (deleted.length === 0) return { success: false, error: "Conversation not found" }

    revalidateOrg(params.orgSlug, ["chat"])
    return { success: true }
  } catch (error) {
    console.error("deleteChat error:", error)
    return { success: false, error: "Failed to delete the chat" }
  }
}

/** Resolve (get or create) the default class conversation. */
export async function resolveClassConversationAction(params: {
  orgSlug: string
  classId: string
}): Promise<AiActionResponse> {
  const user = await requireOrgUser(params.orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  try {
    const conversation = await getOrCreateDefaultClassConversation(
      user.userId,
      user.orgId,
      params.classId,
    )
    return { success: true, conversationId: conversation.id }
  } catch (error) {
    console.error("resolveClassConversationAction error:", error)
    return { success: false, error: "Failed to resolve the class conversation" }
  }
}

/** Reset the default class conversation (delete + recreate). */
export async function resetClassConversationAction(params: {
  orgSlug: string
  classId: string
}): Promise<AiActionResponse> {
  const user = await requireOrgUser(params.orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  try {
    await db
      .delete(aiConversations)
      .where(
        and(
          eq(aiConversations.userId, user.userId),
          eq(aiConversations.orgId, user.orgId),
          eq(aiConversations.surface, "class"),
          eq(aiConversations.entityId, params.classId),
        ),
      )

    const conversation = await getOrCreateDefaultClassConversation(
      user.userId,
      user.orgId,
      params.classId,
    )

    revalidateOrg(params.orgSlug, ["chat", `classes/${params.classId}`])
    return { success: true, conversationId: conversation.id }
  } catch (error) {
    console.error("resetClassConversationAction error:", error)
    return { success: false, error: "Failed to reset the class conversation" }
  }
}