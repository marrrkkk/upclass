import { NextRequest, NextResponse } from "next/server"
import { and, eq, lte } from "drizzle-orm"

import { db } from "@/db"
import {
  messageNotificationOutbox,
  messages,
  user,
} from "@/db/schema"
import { deliverMessageNotification } from "@/lib/notifications/delivery"

export const maxDuration = 60

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const jobs = await db
    .select({
      job: messageNotificationOutbox,
      message: messages,
      recipient: user,
    })
    .from(messageNotificationOutbox)
    .innerJoin(messages, eq(messages.id, messageNotificationOutbox.messageId))
    .innerJoin(user, eq(user.id, messageNotificationOutbox.recipientId))
    .where(
      and(
        eq(messageNotificationOutbox.status, "pending"),
        lte(messageNotificationOutbox.nextAttemptAt, new Date()),
      ),
    )
    .limit(50)

  let delivered = 0
  let failed = 0

  for (const item of jobs) {
    await db
      .update(messageNotificationOutbox)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(messageNotificationOutbox.id, item.job.id))

    try {
      const [sender] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, item.message.senderId))
        .limit(1)

      await deliverMessageNotification({
        recipient: {
          userId: item.recipient.id,
          email: item.recipient.email,
          messageNotifications: item.recipient.messageNotifications,
          emailNotifications: item.recipient.emailNotifications,
          pushNotifications: item.recipient.pushNotifications,
        },
        senderName: sender?.name || "UpClass user",
        preview: item.message.content,
      })

      await db
        .update(messageNotificationOutbox)
        .set({ status: "sent", updatedAt: new Date(), lastError: null })
        .where(eq(messageNotificationOutbox.id, item.job.id))
      delivered += 1
    } catch (error) {
      const attemptCount = item.job.attemptCount + 1
      const delay = Math.min(300_000, 5_000 * 2 ** Math.max(0, attemptCount - 1))
      await db
        .update(messageNotificationOutbox)
        .set({
          status: attemptCount >= 8 ? "failed" : "pending",
          attemptCount,
          nextAttemptAt: new Date(Date.now() + delay),
          lastError: error instanceof Error ? error.message : "Notification delivery failed",
          updatedAt: new Date(),
        })
        .where(eq(messageNotificationOutbox.id, item.job.id))
      failed += 1
    }
  }

  return NextResponse.json({ success: true, delivered, failed })
}
