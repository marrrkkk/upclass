import { and, desc, eq, inArray, or, sql } from "drizzle-orm"

import { db } from "@/db"
import {
  channelMessages,
  classChannels,
  classMembership,
  classes,
  messages,
  user,
} from "@/db/schema"

type ConversationRow = {
  userId: string
  userName: string | null
  userImage: string | null
  lastMessage: string
  lastMessageTime: Date | string | null
  unreadCount: number
}

type ChannelSummaryRow = {
  channelId: string
  classId: string
  className: string
  classColor: string | null
  channelName: string
  lastMessage: string | null
  lastMessageTime: Date | string | null
  unreadCount: number
}

function toIsoString(value: Date | string | null) {
  if (!value) return ""

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString()
  }

  const parsedValue = new Date(value)
  return Number.isNaN(parsedValue.getTime()) ? "" : parsedValue.toISOString()
}

export async function ensureGeneralChannelsForUser(userId: string) {
  const memberships = await db
    .select({
      classId: classes.id,
      ownerId: classes.ownerId,
    })
    .from(classMembership)
    .innerJoin(classes, eq(classMembership.classId, classes.id))
    .where(eq(classMembership.userId, userId))

  if (!memberships.length) return

  const classIds = memberships.map((membership) => membership.classId)
  const existingChannels = await db
    .select({
      classId: classChannels.classId,
    })
    .from(classChannels)
    .where(
      and(
        inArray(classChannels.classId, classIds),
        eq(classChannels.slug, "general"),
      ),
    )

  const existingClassIds = new Set(existingChannels.map((channel) => channel.classId))
  const missingChannels = memberships.filter((membership) => !existingClassIds.has(membership.classId))

  if (!missingChannels.length) return

  await db.insert(classChannels).values(
    missingChannels.map((membership) => ({
      id: crypto.randomUUID(),
      classId: membership.classId,
      name: "General",
      slug: "general",
      isDefault: true,
      createdBy: membership.ownerId,
    })),
  )
}

export async function getConversationSummaries(userId: string) {
  const result = await db.execute(sql<ConversationRow>`
    WITH conversation_rows AS (
      SELECT
        CASE
          WHEN messages.sender_id = ${userId} THEN messages.receiver_id
          ELSE messages.sender_id
        END AS "userId",
        messages.content AS "lastMessage",
        messages.created_at AS "lastMessageTime",
        ROW_NUMBER() OVER (
          PARTITION BY CASE
            WHEN messages.sender_id = ${userId} THEN messages.receiver_id
            ELSE messages.sender_id
          END
          ORDER BY messages.created_at DESC
        ) AS row_number,
        SUM(
          CASE
            WHEN messages.receiver_id = ${userId} AND messages.read = false THEN 1
            ELSE 0
          END
        ) OVER (
          PARTITION BY CASE
            WHEN messages.sender_id = ${userId} THEN messages.receiver_id
            ELSE messages.sender_id
          END
        ) AS "unreadCount"
      FROM messages
      WHERE messages.sender_id = ${userId} OR messages.receiver_id = ${userId}
    )
    SELECT
      conversation_rows."userId",
      "user".name AS "userName",
      "user".image AS "userImage",
      conversation_rows."lastMessage",
      conversation_rows."lastMessageTime",
      conversation_rows."unreadCount"
    FROM conversation_rows
    INNER JOIN "user" ON "user".id = conversation_rows."userId"
    WHERE conversation_rows.row_number = 1
    ORDER BY conversation_rows."lastMessageTime" DESC
  `)

  const rows = Array.from(result) as ConversationRow[]

  return rows.map((row) => ({
    kind: "direct" as const,
    id: row.userId,
    userId: row.userId,
    title: row.userName ?? "User",
    userName: row.userName ?? "User",
    userImage: row.userImage,
    lastMessage: row.lastMessage,
    lastMessageTime: toIsoString(row.lastMessageTime),
    unreadCount: Number(row.unreadCount) || 0,
    href: `/messages/${row.userId}`,
  }))
}

export async function getChannelSummaries(userId: string) {
  await ensureGeneralChannelsForUser(userId)

  const result = await db.execute(sql<ChannelSummaryRow>`
    WITH accessible_channels AS (
      SELECT
        class_channels.id AS "channelId",
        class_channels.class_id AS "classId",
        class_channels.name AS "channelName",
        classes.title AS "className",
        classes.color AS "classColor"
      FROM class_channels
      INNER JOIN classes ON classes.id = class_channels.class_id
      INNER JOIN class_membership ON class_membership.class_id = classes.id
      WHERE class_membership.user_id = ${userId}
    ),
    channel_rows AS (
      SELECT
        accessible_channels."channelId",
        accessible_channels."classId",
        accessible_channels."className",
        accessible_channels."classColor",
        accessible_channels."channelName",
        channel_messages.content AS "lastMessage",
        channel_messages.created_at AS "lastMessageTime",
        ROW_NUMBER() OVER (
          PARTITION BY accessible_channels."channelId"
          ORDER BY channel_messages.created_at DESC NULLS LAST
        ) AS row_number,
        SUM(
          CASE
            WHEN channel_messages.sender_id <> ${userId}
              AND channel_messages.read_by NOT LIKE ${`%"${userId}"%`}
            THEN 1
            ELSE 0
          END
        ) OVER (
          PARTITION BY accessible_channels."channelId"
        ) AS "unreadCount"
      FROM accessible_channels
      LEFT JOIN channel_messages ON channel_messages.channel_id = accessible_channels."channelId"
    )
    SELECT
      channel_rows."channelId",
      channel_rows."classId",
      channel_rows."className",
      channel_rows."classColor",
      channel_rows."channelName",
      channel_rows."lastMessage",
      channel_rows."lastMessageTime",
      channel_rows."unreadCount"
    FROM channel_rows
    WHERE channel_rows.row_number = 1 OR channel_rows.row_number IS NULL
    ORDER BY channel_rows."lastMessageTime" DESC NULLS LAST, channel_rows."className" ASC
  `)

  const rows = Array.from(result) as ChannelSummaryRow[]

  return rows.map((row) => ({
    kind: "channel" as const,
    id: row.channelId,
    channelId: row.channelId,
    classId: row.classId,
    title: `${row.className} · ${row.channelName}`,
    className: row.className,
    classColor: row.classColor || "#3b82f6",
    channelName: row.channelName,
    lastMessage: row.lastMessage || "No messages yet",
    lastMessageTime: toIsoString(row.lastMessageTime),
    unreadCount: Number(row.unreadCount) || 0,
    href: `/messages/class/${row.classId}`,
  }))
}

export async function searchMessageThreads(userId: string, query: string) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  await ensureGeneralChannelsForUser(userId)
  const pattern = `%${trimmedQuery}%`

  const directHits = await db
    .select({
      id: messages.id,
      title: user.name,
      subtitle: sql<string>`'Direct message'`,
      snippet: messages.content,
      href: sql<string>`'/messages/' || "user".id`,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(
      user,
      or(
        and(eq(messages.senderId, user.id), eq(messages.receiverId, userId)),
        and(eq(messages.receiverId, user.id), eq(messages.senderId, userId)),
      ),
    )
    .where(
      and(
        or(eq(messages.senderId, userId), eq(messages.receiverId, userId)),
        or(
          sql`${messages.content} ILIKE ${pattern}`,
          sql`${user.name} ILIKE ${pattern}`,
        ),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(10)

  const channelHits = await db
    .select({
      id: channelMessages.id,
      title: classes.title,
      subtitle: classChannels.name,
      snippet: channelMessages.content,
      href: sql<string>`'/messages/class/' || ${classChannels.classId}`,
      createdAt: channelMessages.createdAt,
    })
    .from(channelMessages)
    .innerJoin(classChannels, eq(channelMessages.channelId, classChannels.id))
    .innerJoin(classes, eq(classChannels.classId, classes.id))
    .innerJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(
      and(
        eq(classMembership.userId, userId),
        or(
          sql`${channelMessages.content} ILIKE ${pattern}`,
          sql`${classes.title} ILIKE ${pattern}`,
          sql`${classChannels.name} ILIKE ${pattern}`,
        ),
      ),
    )
    .orderBy(desc(channelMessages.createdAt))
    .limit(10)

  return [...directHits, ...channelHits]
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
      return rightTime - leftTime
    })
    .slice(0, 12)
    .map((hit) => ({
      id: hit.id,
      title: hit.title || "Message",
      subtitle: hit.subtitle || "",
      snippet: hit.snippet,
      href: hit.href,
      createdAt: toIsoString(hit.createdAt),
    }))
}

export async function getAccessibleChannelForClass(userId: string, classId: string) {
  await ensureGeneralChannelsForUser(userId)

  const rows = await db
    .select({
      id: classChannels.id,
      classId: classChannels.classId,
      channelName: classChannels.name,
      className: classes.title,
      classColor: classes.color,
    })
    .from(classChannels)
    .innerJoin(classes, eq(classChannels.classId, classes.id))
    .innerJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(
      and(
        eq(classChannels.classId, classId),
        eq(classChannels.slug, "general"),
        eq(classMembership.userId, userId),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}
