"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { whiteboards, whiteboardCursors, classMembership } from "@/db/schema"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

export async function updateWhiteboard(
  whiteboardId: string,
  data: string,
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify user has access to this whiteboard
    const whiteboard = await db
      .select()
      .from(whiteboards)
      .where(eq(whiteboards.id, whiteboardId))
      .limit(1)

    if (whiteboard.length === 0) {
      return { success: false, error: "Whiteboard not found" }
    }

    const membership = await db
      .select()
      .from(classMembership)
      .where(
        and(
          eq(classMembership.classId, whiteboard[0].classId),
          eq(classMembership.userId, session.user.id),
        ),
      )
      .limit(1)

    if (membership.length === 0) {
      return { success: false, error: "Unauthorized" }
    }

    await db
      .update(whiteboards)
      .set({
        data,
        updatedAt: new Date(),
      })
      .where(eq(whiteboards.id, whiteboardId))

    return { success: true }
  } catch (error) {
    console.error("updateWhiteboard error", error)
    return { success: false, error: "Failed to update whiteboard" }
  }
}

export async function updateCursor(
  whiteboardId: string,
  userId: string,
  x: number,
  y: number,
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id || session.user.id !== userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Check if cursor exists
    const existing = await db
      .select()
      .from(whiteboardCursors)
      .where(
        and(
          eq(whiteboardCursors.whiteboardId, whiteboardId),
          eq(whiteboardCursors.userId, userId),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      // Update existing cursor
      await db
        .update(whiteboardCursors)
        .set({
          x: x.toString(),
          y: y.toString(),
          updatedAt: new Date(),
        })
        .where(eq(whiteboardCursors.id, existing[0].id))
    } else {
      // Create new cursor
      await db.insert(whiteboardCursors).values({
        id: crypto.randomUUID(),
        whiteboardId,
        userId,
        x: x.toString(),
        y: y.toString(),
      })
    }

    return { success: true }
  } catch (error) {
    console.error("updateCursor error", error)
    return { success: false, error: "Failed to update cursor" }
  }
}

