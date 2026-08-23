/**
 * Conversation persistence: CRUD, keyset cursor pagination, auto-title, and
 * the per-class default conversation lifecycle.
 */
import { and, asc, desc, eq, lt, or, sql, type SQL } from "drizzle-orm"

import { db } from "@/db"
import {
  aiConversations,
  aiMessages,
  conversationSummaries,
  type aiConversationSurface,
} from "@/db/schema"
import type {
  AiConversationRow,
  AiMessageRow,
  AiMessageStatus,
  AiMessagesPage,
  AiSurface,
} from "@/lib/ai/types"

export type AiConversationSurface = (typeof aiConversationSurface.enumValues)[number]

const DEFAULT_TITLE = "New chat"

export type CreateConversationInput = {
  userId: string
  orgId: string
  surface: AiSurface
  entityId: string
  title?: string
  isDefault?: boolean
  firstMessage?: string
  clientMessageId?: string
}

export async function createConversation(
  input: CreateConversationInput,
): Promise<AiConversationRow> {
  const conversationId = crypto.randomUUID()

  const conversation = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(aiConversations)
      .values({
        id: conversationId,
        userId: input.userId,
        orgId: input.orgId,
        surface: input.surface,
        entityId: input.entityId,
        title: input.title ?? DEFAULT_TITLE,
        isDefault: input.isDefault ?? false,
      })
      .returning()

    if (!inserted) {
      throw new Error("Conversation insert returned no row")
    }

    if (input.firstMessage?.trim()) {
      await tx
        .insert(aiMessages)
        .values({
          id: crypto.randomUUID(),
          conversationId,
          role: "user",
          content: input.firstMessage.trim(),
          clientMessageId: input.clientMessageId ?? null,
        })
        .onConflictDoNothing({
          target: [aiMessages.conversationId, aiMessages.clientMessageId],
      })
    }

    return inserted
  })

  return conversation
}

/** Get the (single) default conversation for a class surface, creating it. */
export async function getOrCreateDefaultClassConversation(
  userId: string,
  orgId: string,
  classId: string,
): Promise<AiConversationRow> {
  const existing = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.orgId, orgId),
        eq(aiConversations.surface, "class"),
        eq(aiConversations.entityId, classId),
        eq(aiConversations.isDefault, true),
      ),
    )
    .limit(1)

  if (existing[0]) return existing[0]

  const rows = await db
    .insert(aiConversations)
    .values({
      id: crypto.randomUUID(),
      userId,
      orgId,
      surface: "class",
      entityId: classId,
      title: DEFAULT_TITLE,
      isDefault: true,
    })
    .onConflictDoNothing({
      target: [
        aiConversations.userId,
        aiConversations.orgId,
        aiConversations.surface,
        aiConversations.entityId,
      ],
    })
    .returning()

  if (rows[0]) return rows[0]

  const [afterRace] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.orgId, orgId),
        eq(aiConversations.surface, "class"),
        eq(aiConversations.entityId, classId),
        eq(aiConversations.isDefault, true),
      ),
    )
    .limit(1)
  return afterRace
}

export async function getConversation(id: string): Promise<AiConversationRow | null> {
  const rows = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function listDashboardConversations(
  userId: string,
  orgId: string,
  limit = 20,
): Promise<AiConversationRow[]> {
  const clamped = Math.min(50, Math.max(1, limit))
  return db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.orgId, orgId),
        eq(aiConversations.surface, "dashboard"),
      ),
    )
    .orderBy(
      sql`CASE WHEN ${aiConversations.lastMessageAt} IS NULL THEN 1 ELSE 0 END`,
      desc(aiConversations.lastMessageAt),
    )
    .limit(clamped)
}

export async function listClassConversations(
  userId: string,
  orgId: string,
  entityId: string,
  limit = 20,
): Promise<AiConversationRow[]> {
  const clamped = Math.min(50, Math.max(1, limit))
  return db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.orgId, orgId),
        eq(aiConversations.surface, "class"),
        eq(aiConversations.entityId, entityId),
      ),
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(clamped)
}

/** Get the (single) default conversation for a resource surface, creating it. */
export async function getOrCreateDefaultResourceConversation(
  userId: string,
  orgId: string,
  resourceId: string,
): Promise<AiConversationRow> {
  const existing = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.orgId, orgId),
        eq(aiConversations.surface, "resource"),
        eq(aiConversations.entityId, resourceId),
        eq(aiConversations.isDefault, true),
      ),
    )
    .limit(1)

  if (existing[0]) return existing[0]

  const rows = await db
    .insert(aiConversations)
    .values({
      id: crypto.randomUUID(),
      userId,
      orgId,
      surface: "resource",
      entityId: resourceId,
      title: DEFAULT_TITLE,
      isDefault: true,
    })
    .onConflictDoNothing({
      target: [
        aiConversations.userId,
        aiConversations.orgId,
        aiConversations.surface,
        aiConversations.entityId,
      ],
    })
    .returning()

  if (rows[0]) return rows[0]

  const [afterRace] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.orgId, orgId),
        eq(aiConversations.surface, "resource"),
        eq(aiConversations.entityId, resourceId),
        eq(aiConversations.isDefault, true),
      ),
    )
    .limit(1)
  return afterRace
}

export async function listResourceConversations(
  userId: string,
  orgId: string,
  entityId: string,
  limit = 20,
): Promise<AiConversationRow[]> {
  const clamped = Math.min(50, Math.max(1, limit))
  return db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.orgId, orgId),
        eq(aiConversations.surface, "resource"),
        eq(aiConversations.entityId, entityId),
      ),
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(clamped)
}

export async function listStudyConversations(
  userId: string,
  orgId: string,
  entityId: string,
  limit = 20,
): Promise<AiConversationRow[]> {
  const clamped = Math.min(50, Math.max(1, limit))
  return db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.orgId, orgId),
        eq(aiConversations.surface, "study"),
        eq(aiConversations.entityId, entityId),
      ),
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(clamped)
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await db
    .update(aiConversations)
    .set({ title: title.slice(0, 100) || DEFAULT_TITLE })
    .where(eq(aiConversations.id, id))
}

/** Auto-title a conversation from its first user message. */
export async function autoTitleConversation(id: string, firstMessage: string): Promise<void> {
  const title = firstMessage
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
  if (title) {
    await updateConversationTitle(id, title)
  }
}

export async function touchConversation(id: string): Promise<void> {
  await db
    .update(aiConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(aiConversations.id, id))
}

export async function deleteConversation(id: string): Promise<boolean> {
  const rows = await db
    .delete(aiConversations)
    .where(eq(aiConversations.id, id))
    .returning({ id: aiConversations.id })
  return rows.length > 0
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

export type InsertUserMessageInput = {
  conversationId: string
  content: string
  clientMessageId?: string
}

export async function insertUserMessage(
  input: InsertUserMessageInput,
): Promise<AiMessageRow | null> {
  const rows = await db
    .insert(aiMessages)
    .values({
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      role: "user",
      content: input.content,
      clientMessageId: input.clientMessageId ?? null,
    })
    .onConflictDoNothing({
      target: [aiMessages.conversationId, aiMessages.clientMessageId],
    })
    .returning()
  return rows[0] ?? null
}

export async function insertAssistantMessage(
  conversationId: string,
  content: string,
): Promise<AiMessageRow> {
  const rows = await db
    .insert(aiMessages)
    .values({
      id: crypto.randomUUID(),
      conversationId,
      role: "assistant",
      content,
      status: "generating",
    })
    .returning()
  return rows[0]
}

export async function updateAssistantMessage(
  messageId: string,
  input: {
    content: string
    status: AiMessageStatus
    provider?: string | null
    model?: string | null
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  await db
    .update(aiMessages)
    .set({
      content: input.content,
      status: input.status,
      provider: input.provider ?? null,
      model: input.model ?? null,
      metadata: input.metadata ?? {},
    })
    .where(eq(aiMessages.id, messageId))
}

/** Mark a failed assistant row (error reasons keep the message history visible). */
export async function failAssistantMessage(
  messageId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await updateAssistantMessage(messageId, { content: "", status: "failed", metadata })
}

export async function getRecentMessages(
  conversationId: string,
  limit = 20,
): Promise<AiMessageRow[]> {
  const clamped = Math.min(50, Math.max(1, limit))
  const rows = await db
    .select()
    .from(aiMessages)
    .where(
      and(
        eq(aiMessages.conversationId, conversationId),
        eq(aiMessages.status, "completed"),
      ),
    )
    .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
    .limit(clamped)
  return rows.reverse()
}

export async function getMessagesSince(
  conversationId: string,
  afterId: string,
): Promise<AiMessageRow[]> {
  return db
    .select()
    .from(aiMessages)
    .where(
      and(
        eq(aiMessages.conversationId, conversationId),
        eq(aiMessages.status, "completed"),
        sql`${aiMessages.id} > ${afterId}`,
      ),
    )
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id))
}

/* -------------------------------------------------------------------------- */
/* Cursor pagination                                                          */
/* -------------------------------------------------------------------------- */

export function encodeMessagesCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}__${id}`, "utf8")
    .toString("base64url")
}

export function decodeMessagesCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8")
    const separatorIndex = decoded.lastIndexOf("__")
    if (separatorIndex === -1) return null
    const createdAt = new Date(decoded.slice(0, separatorIndex))
    const id = decoded.slice(separatorIndex + 2)
    if (Number.isNaN(createdAt.getTime()) || !id) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

/** Page messages older than `before` (keyset on created_at, id). */
export async function listMessagesPage(
  conversationId: string,
  options: { limit?: number; before?: string | null } = {},
): Promise<AiMessagesPage> {
  const limit = Math.min(50, Math.max(1, options.limit ?? 30))

  const cursor = options.before ? decodeMessagesCursor(options.before) : null
  if (options.before && !cursor) {
    throw new Error("Invalid cursor")
  }

  const conditions: SQL[] = [
    eq(aiMessages.conversationId, conversationId),
    eq(aiMessages.status, "completed"),
  ]
  if (cursor) {
    conditions.push(
      or(
        lt(aiMessages.createdAt, cursor.createdAt),
        and(eq(aiMessages.createdAt, cursor.createdAt), lt(aiMessages.id, cursor.id)),
      ) as SQL,
    )
  }

  const rows = await db
    .select()
    .from(aiMessages)
    .where(and(...conditions.filter(Boolean)))
    .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  const lastRow = pageRows.at(-1)

  return {
    messages: pageRows.reverse(),
    nextCursor: hasMore && lastRow ? encodeMessagesCursor(lastRow.createdAt, lastRow.id) : null,
    hasMore,
  }
}

export async function upsertConversationSummary(
  conversationId: string,
  summary: string,
  messageCount: number,
): Promise<void> {
  await db
    .insert(conversationSummaries)
    .values({ conversationId, summary, messageCount })
    .onConflictDoUpdate({
      target: conversationSummaries.conversationId,
      set: { summary, messageCount, updatedAt: new Date() },
    })
}

export async function getConversationSummary(
  conversationId: string,
): Promise<{ summary: string; messageCount: number } | null> {
  const rows = await db
    .select({ summary: conversationSummaries.summary, messageCount: conversationSummaries.messageCount })
    .from(conversationSummaries)
    .where(eq(conversationSummaries.conversationId, conversationId))
    .limit(1)
  return rows[0] ?? null
}

export async function countConversationMessages(conversationId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int`.as("count") })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
  return Number(row?.count ?? 0)
}

export async function getCompletedMessagesAfter(
  conversationId: string,
  offset: number,
  limit = 50,
): Promise<AiMessageRow[]> {
  return db
    .select()
    .from(aiMessages)
    .where(and(eq(aiMessages.conversationId, conversationId), eq(aiMessages.status, "completed")))
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id))
    .offset(Math.max(0, offset))
    .limit(Math.min(50, Math.max(1, limit)))
}
