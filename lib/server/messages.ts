import { sql } from "drizzle-orm"

import { db } from "@/db"

type ConversationRow = {
  userId: string
  userName: string | null
  userImage: string | null
  lastMessage: string
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
    userId: row.userId,
    userName: row.userName ?? "User",
    userImage: row.userImage,
    lastMessage: row.lastMessage,
    lastMessageTime: toIsoString(row.lastMessageTime),
    unreadCount: Number(row.unreadCount) || 0,
  }))
}
