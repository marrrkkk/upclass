import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classMembership, whiteboardSnapshots, whiteboards } from "@/db/schema"

async function getWhiteboardResponse(boardId: string) {
  const [board] = await db
    .select({
      id: whiteboards.id,
      classId: whiteboards.classId,
      title: whiteboards.title,
      ownerId: whiteboards.ownerId,
      data: whiteboards.data,
      createdAt: whiteboards.createdAt,
      updatedAt: whiteboards.updatedAt,
    })
    .from(whiteboards)
    .where(eq(whiteboards.id, boardId))
    .limit(1)

  if (!board) {
    return null
  }

  const [snapshot] = await db
    .select({
      id: whiteboardSnapshots.id,
      document: whiteboardSnapshots.document,
      version: whiteboardSnapshots.version,
      updatedAt: whiteboardSnapshots.updatedAt,
    })
    .from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.boardId, boardId))
    .limit(1)

  return {
    board: {
      id: board.id,
      classId: board.classId,
      title: board.title,
      ownerId: board.ownerId,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
    },
    snapshot: {
      id: snapshot?.id ?? `snapshot-${board.id}`,
      boardId: board.id,
      version: snapshot?.version ?? 0,
      document: snapshot?.document ?? null,
      legacyData: board.data,
      updatedAt: snapshot?.updatedAt?.toISOString() ?? null,
    },
  }
}

async function requireWhiteboardAccess(boardId: string) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    })
  } catch (error) {
    console.error("Failed to get whiteboard API session", error)
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const [board] = await db
    .select({
      id: whiteboards.id,
      classId: whiteboards.classId,
      title: whiteboards.title,
      ownerId: whiteboards.ownerId,
      data: whiteboards.data,
      createdAt: whiteboards.createdAt,
      updatedAt: whiteboards.updatedAt,
    })
    .from(whiteboards)
    .where(eq(whiteboards.id, boardId))
    .limit(1)

  if (!board) {
    return { error: NextResponse.json({ error: "Whiteboard not found" }, { status: 404 }) }
  }

  const membership = await db
    .select({ userId: classMembership.userId })
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, board.classId),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) }
  }

  return {
    session,
    board,
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ whiteboardId: string }> },
) {
  const { whiteboardId } = await context.params
  const access = await requireWhiteboardAccess(whiteboardId)
  if ("error" in access) return access.error

  const response = await getWhiteboardResponse(whiteboardId)
  if (!response) {
    return NextResponse.json({ error: "Whiteboard not found" }, { status: 404 })
  }

  return NextResponse.json(response)
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ whiteboardId: string }> },
) {
  const { whiteboardId } = await context.params
  const access = await requireWhiteboardAccess(whiteboardId)
  if ("error" in access) return access.error

  const body = (await request.json()) as {
    document?: Record<string, unknown>
    expectedVersion?: number
  }

  if (!body.document || typeof body.document !== "object") {
    return NextResponse.json({ error: "Missing or invalid document payload" }, { status: 400 })
  }

  if (
    typeof body.expectedVersion !== "number" ||
    !Number.isInteger(body.expectedVersion) ||
    body.expectedVersion < 0
  ) {
    return NextResponse.json({ error: "Missing or invalid expectedVersion" }, { status: 400 })
  }

  const [existingSnapshot] = await db
    .select({
      id: whiteboardSnapshots.id,
      version: whiteboardSnapshots.version,
    })
    .from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.boardId, whiteboardId))
    .limit(1)

  const currentVersion = existingSnapshot?.version ?? 0
  if (body.expectedVersion !== currentVersion) {
    const latest = await getWhiteboardResponse(whiteboardId)
    return NextResponse.json(latest, { status: 409 })
  }

  const nextVersion = currentVersion + 1

  const [snapshot] = existingSnapshot
    ? await db
        .update(whiteboardSnapshots)
        .set({
          document: body.document,
          version: nextVersion,
          createdBy: access.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(whiteboardSnapshots.id, existingSnapshot.id))
        .returning({
          id: whiteboardSnapshots.id,
          boardId: whiteboardSnapshots.boardId,
          document: whiteboardSnapshots.document,
          version: whiteboardSnapshots.version,
          updatedAt: whiteboardSnapshots.updatedAt,
        })
    : await db
        .insert(whiteboardSnapshots)
        .values({
          id: crypto.randomUUID(),
          boardId: whiteboardId,
          document: body.document,
          version: nextVersion,
          createdBy: access.session.user.id,
        })
        .returning({
          id: whiteboardSnapshots.id,
          boardId: whiteboardSnapshots.boardId,
          document: whiteboardSnapshots.document,
          version: whiteboardSnapshots.version,
          updatedAt: whiteboardSnapshots.updatedAt,
        })

  const [board] = await db
    .update(whiteboards)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(whiteboards.id, whiteboardId))
    .returning({
      id: whiteboards.id,
      classId: whiteboards.classId,
      title: whiteboards.title,
      ownerId: whiteboards.ownerId,
      data: whiteboards.data,
      createdAt: whiteboards.createdAt,
      updatedAt: whiteboards.updatedAt,
    })

  return NextResponse.json({
    board: {
      id: board.id,
      classId: board.classId,
      title: board.title,
      ownerId: board.ownerId,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
    },
    snapshot: {
      id: snapshot.id,
      boardId: snapshot.boardId,
      version: snapshot.version,
      document: snapshot.document,
      legacyData: board.data,
      updatedAt: snapshot.updatedAt.toISOString(),
    },
  })
}
