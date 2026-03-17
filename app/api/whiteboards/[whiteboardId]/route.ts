import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classMembership, whiteboards } from "@/db/schema"

async function requireWhiteboardAccess(whiteboardId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const whiteboard = await db
    .select({
      id: whiteboards.id,
      classId: whiteboards.classId,
      data: whiteboards.data,
      updatedAt: whiteboards.updatedAt,
    })
    .from(whiteboards)
    .where(eq(whiteboards.id, whiteboardId))
    .limit(1)

  if (whiteboard.length === 0) {
    return { error: NextResponse.json({ error: "Whiteboard not found" }, { status: 404 }) }
  }

  const membership = await db
    .select({ userId: classMembership.userId })
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, whiteboard[0].classId),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) }
  }

  return {
    session,
    whiteboard: whiteboard[0],
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ whiteboardId: string }> },
) {
  const { whiteboardId } = await context.params
  const access = await requireWhiteboardAccess(whiteboardId)
  if ("error" in access) return access.error

  return NextResponse.json({
    id: access.whiteboard.id,
    data: access.whiteboard.data,
    updatedAt: access.whiteboard.updatedAt.toISOString(),
  })
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ whiteboardId: string }> },
) {
  const { whiteboardId } = await context.params
  const access = await requireWhiteboardAccess(whiteboardId)
  if ("error" in access) return access.error

  const body = (await request.json()) as {
    data?: string
    clientUpdatedAt?: string
  }

  if (typeof body.data !== "string") {
    return NextResponse.json({ error: "Missing or invalid data payload" }, { status: 400 })
  }

  // Basic payload validation: must be valid JSON
  try {
    JSON.parse(body.data)
  } catch {
    return NextResponse.json({ error: "Whiteboard data must be valid JSON" }, { status: 400 })
  }

  const existing = access.whiteboard
  const clientUpdatedAt =
    typeof body.clientUpdatedAt === "string" ? new Date(body.clientUpdatedAt) : null

  if (clientUpdatedAt && existing.updatedAt > clientUpdatedAt) {
    // Another client has written a newer version – return the latest snapshot
    return NextResponse.json(
      {
        conflict: true,
        data: existing.data,
        updatedAt: existing.updatedAt.toISOString(),
      },
      { status: 409 },
    )
  }

  const [updated] = await db
    .update(whiteboards)
    .set({
      data: body.data,
      updatedAt: new Date(),
    })
    .where(eq(whiteboards.id, whiteboardId))
    .returning({
      id: whiteboards.id,
      data: whiteboards.data,
      updatedAt: whiteboards.updatedAt,
    })

  return NextResponse.json({
    id: updated.id,
    data: updated.data,
    updatedAt: updated.updatedAt.toISOString(),
  })
}

