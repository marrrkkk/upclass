import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { aiConversations, aiFeedback, aiMessages } from "@/db/schema"
import { auth } from "@/lib/auth"

export const maxDuration = 30

const feedbackBodySchema = z.object({
  messageId: z.string().min(1),
  rating: z.enum(["up", "down"]),
  reason: z.string().max(2_000).optional(),
  runId: z.string().min(1).max(128).optional(),
})

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: NO_STORE })
  }

  const parsed = feedbackBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid feedback" },
      { status: 400, headers: NO_STORE },
    )
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  }
  const userId = session.user.id

  // The message must exist and belong to a conversation owned by the user.
  const [message] = await db
    .select({ id: aiMessages.id, conversationId: aiMessages.conversationId })
    .from(aiMessages)
    .where(eq(aiMessages.id, parsed.data.messageId))
    .limit(1)
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404, headers: NO_STORE })
  }

  const [conversation] = await db
    .select({ id: aiConversations.id, userId: aiConversations.userId, orgId: aiConversations.orgId })
    .from(aiConversations)
    .where(eq(aiConversations.id, message.conversationId))
    .limit(1)
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json({ error: "Message not found" }, { status: 404, headers: NO_STORE })
  }

  try {
    await db
      .insert(aiFeedback)
      .values({
        id: crypto.randomUUID(),
        messageId: message.id,
        runId: parsed.data.runId ?? null,
        userId,
        orgId: conversation.orgId,
        rating: parsed.data.rating,
        reason: parsed.data.reason?.trim() || null,
      })
      .onConflictDoUpdate({
        target: [aiFeedback.messageId, aiFeedback.userId],
        set: {
          rating: parsed.data.rating,
          reason: parsed.data.reason?.trim() || null,
          metadata: { updatedAt: new Date().toISOString() },
        },
      })
  } catch (error) {
    console.error("[ai-feedback] failed to store feedback:", error)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500, headers: NO_STORE })
  }

  return NextResponse.json({ success: true }, { headers: NO_STORE })
}