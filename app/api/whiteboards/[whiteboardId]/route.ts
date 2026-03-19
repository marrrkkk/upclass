import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classMembership, whiteboardSnapshots, whiteboards } from "@/db/schema"

async function requireWhiteboardAccess(boardId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

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

  const [snapshot] = await db
    .select({
      id: whiteboardSnapshots.id,
      document: whiteboardSnapshots.document,
      version: whiteboardSnapshots.version,
      updatedAt: whiteboardSnapshots.updatedAt,
    })
    .from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.boardId, whiteboardId))
    .limit(1)

  return NextResponse.json({
    board: {
      id: access.board.id,
      classId: access.board.classId,
      title: access.board.title,
      ownerId: access.board.ownerId,
      createdAt: access.board.createdAt.toISOString(),
      updatedAt: access.board.updatedAt.toISOString(),
    },
    snapshot: {
      id: snapshot?.id ?? `snapshot-${access.board.id}`,
      boardId: access.board.id,
      version: snapshot?.version ?? 0,
      document: snapshot?.document ?? null,
      legacyData: access.board.data,
      updatedAt: snapshot?.updatedAt?.toISOString() ?? null,
    },
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
    document?: Record<string, unknown>
    version?: number
  }

  if (!body.document || typeof body.document !== "object") {
    return NextResponse.json({ error: "Missing or invalid document payload" }, { status: 400 })
  }

  const [existingSnapshot] = await db
    .select({
      id: whiteboardSnapshots.id,
      version: whiteboardSnapshots.version,
    })
    .from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.boardId, whiteboardId))
    .limit(1)

  const nextVersion = Math.max(existingSnapshot?.version ?? 0, body.version ?? 0) + 1

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
