import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { and, asc, eq, gt, sql } from "drizzle-orm"

import { db } from "@/db"
import { classMembership, whiteboardOperations, whiteboards } from "@/db/schema"
import { auth } from "@/lib/auth"
import {
  buildSnapshotFromOperations,
  deserializeWhiteboardOperation,
  parseOperationPayload,
} from "@/lib/whiteboard/operations"
import type { WhiteboardOperationInput } from "@/types/whiteboard"

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
      lastSequence: whiteboards.lastSequence,
      snapshotSequence: whiteboards.snapshotSequence,
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
  request: Request,
  context: { params: Promise<{ whiteboardId: string }> },
) {
  const { whiteboardId } = await context.params
  const access = await requireWhiteboardAccess(whiteboardId)
  if ("error" in access) return access.error

  const after = Number(new URL(request.url).searchParams.get("after") || "0")
  try {
    const operations = await db
      .select({
        id: whiteboardOperations.id,
        whiteboardId: whiteboardOperations.whiteboardId,
        userId: whiteboardOperations.userId,
        sequence: whiteboardOperations.sequence,
        opType: whiteboardOperations.opType,
        payload: whiteboardOperations.payload,
        createdAt: whiteboardOperations.createdAt,
      })
      .from(whiteboardOperations)
      .where(
        and(
          eq(whiteboardOperations.whiteboardId, whiteboardId),
          gt(whiteboardOperations.sequence, Number.isFinite(after) ? after : 0),
        ),
      )
      .orderBy(asc(whiteboardOperations.sequence))
      .limit(500)

    return NextResponse.json({
      lastSequence: access.whiteboard.lastSequence,
      operations: operations.map(deserializeWhiteboardOperation),
    })
  } catch (error) {
    console.error("whiteboard ops fetch fallback", error)
    return NextResponse.json({
      lastSequence: access.whiteboard.lastSequence,
      operations: [],
    })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ whiteboardId: string }> },
) {
  const { whiteboardId } = await context.params
  const access = await requireWhiteboardAccess(whiteboardId)
  if ("error" in access) return access.error

  const body = (await request.json()) as { operations?: WhiteboardOperationInput[] }
  const operations = Array.isArray(body.operations) ? body.operations : []
  if (operations.length === 0) {
    return NextResponse.json({ error: "Operations are required" }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [whiteboardRow] = await tx
        .update(whiteboards)
        .set({
          lastSequence: sql`${whiteboards.lastSequence} + ${operations.length}`,
          updatedAt: new Date(),
        })
        .where(eq(whiteboards.id, whiteboardId))
        .returning({
          id: whiteboards.id,
          data: whiteboards.data,
          lastSequence: whiteboards.lastSequence,
          snapshotSequence: whiteboards.snapshotSequence,
        })

      if (!whiteboardRow) {
        throw new Error("Whiteboard not found")
      }

      const firstSequence = whiteboardRow.lastSequence - operations.length + 1
      const insertRows = operations.map((operation, index) => ({
        id: crypto.randomUUID(),
        whiteboardId,
        userId: access.session.user.id,
        sequence: firstSequence + index,
        opType: operation.type,
        payload: JSON.stringify(operation.payload),
      }))

      await tx.insert(whiteboardOperations).values(insertRows)

      const shouldCompact =
        whiteboardRow.lastSequence - whiteboardRow.snapshotSequence >= 25 ||
        operations.some((operation) => operation.type === "clear")

      let nextSnapshotSequence = whiteboardRow.snapshotSequence
      let nextSnapshotData = whiteboardRow.data

      if (shouldCompact) {
        const pendingOperations = await tx
          .select({
            type: whiteboardOperations.opType,
            payload: whiteboardOperations.payload,
          })
          .from(whiteboardOperations)
          .where(
            and(
              eq(whiteboardOperations.whiteboardId, whiteboardId),
              gt(whiteboardOperations.sequence, whiteboardRow.snapshotSequence),
            ),
          )
          .orderBy(asc(whiteboardOperations.sequence))

        const nextSnapshot = buildSnapshotFromOperations(
          whiteboardRow.data,
          pendingOperations.map((operation) => ({
            type: operation.type as WhiteboardOperationInput["type"],
            payload: parseOperationPayload(operation.payload),
          })),
        )

        nextSnapshotSequence = whiteboardRow.lastSequence
        nextSnapshotData = JSON.stringify(nextSnapshot)

        await tx
          .update(whiteboards)
          .set({
            data: nextSnapshotData,
            snapshotSequence: nextSnapshotSequence,
            updatedAt: new Date(),
          })
          .where(eq(whiteboards.id, whiteboardId))
      }

      return {
        lastSequence: whiteboardRow.lastSequence,
        snapshotSequence: nextSnapshotSequence,
        snapshotData: nextSnapshotData,
        operations: insertRows.map((row, index) => ({
          id: row.id,
          whiteboardId,
          userId: row.userId,
          sequence: row.sequence,
          type: operations[index].type,
          payload: operations[index].payload,
          createdAt: new Date().toISOString(),
        })),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("whiteboard ops commit fallback", error)

    const nextSnapshot = buildSnapshotFromOperations(access.whiteboard.data, operations)
    const nextSnapshotData = JSON.stringify(nextSnapshot)
    const nextSequence = access.whiteboard.lastSequence + operations.length

    const [whiteboardRow] = await db
      .update(whiteboards)
      .set({
        data: nextSnapshotData,
        lastSequence: nextSequence,
        snapshotSequence: nextSequence,
        updatedAt: new Date(),
      })
      .where(eq(whiteboards.id, whiteboardId))
      .returning({
        lastSequence: whiteboards.lastSequence,
        snapshotSequence: whiteboards.snapshotSequence,
      })

    return NextResponse.json({
      lastSequence: whiteboardRow?.lastSequence ?? nextSequence,
      snapshotSequence: whiteboardRow?.snapshotSequence ?? nextSequence,
      snapshotData: nextSnapshotData,
      operations: operations.map((operation, index) => ({
        id: crypto.randomUUID(),
        whiteboardId,
        userId: access.session.user.id,
        sequence: access.whiteboard.lastSequence + index + 1,
        type: operation.type,
        payload: operation.payload,
        createdAt: new Date().toISOString(),
      })),
    })
  }
}
