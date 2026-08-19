import { headers } from "next/headers"
import { notFound, redirect, unstable_rethrow } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { WhiteboardPageClient } from "@/whiteboard/components/whiteboard-page-client"
import { PageContainer } from "@/components/ui/section"
import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classes, classMembership, user, whiteboardSnapshots, whiteboards } from "@/db/schema"

async function getSafeSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    })
  } catch (error) {
    unstable_rethrow(error)
    console.error("Failed to get whiteboard session", error)
    return null
  }
}

export async function WhiteboardData({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const { id, orgSlug } = await params
  const session = await getSafeSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const userId = session.user.id

  const [classData, membershipWithUser, existingWhiteboard] = await Promise.all([
    db
      .select({
        id: classes.id,
        title: classes.title,
        color: classes.color,
      })
      .from(classes)
      .where(eq(classes.id, id))
      .limit(1),
    db
      .select({
        id: classMembership.id,
        userId: classMembership.userId,
        name: user.name,
        image: user.image,
      })
      .from(classMembership)
      .innerJoin(user, eq(user.id, classMembership.userId))
      .where(
        and(
          eq(classMembership.classId, id),
          eq(classMembership.userId, userId),
        ),
      )
      .limit(1),
    db
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
      .where(eq(whiteboards.classId, id))
      .limit(1),
  ])

  if (classData.length === 0) {
    notFound()
  }

  if (membershipWithUser.length === 0) {
    redirect(`/${orgSlug}/classes`)
  }

  const currentUser = {
    id: membershipWithUser[0].userId,
    name: membershipWithUser[0].name,
    image: membershipWithUser[0].image,
  }

  const [board] =
    existingWhiteboard.length > 0
      ? existingWhiteboard
      : await db
          .insert(whiteboards)
          .values({
            id: crypto.randomUUID(),
            classId: id,
            title: `${classData[0].title} Whiteboard`,
            ownerId: currentUser.id,
            data: "[]",
          })
          .returning({
            id: whiteboards.id,
            classId: whiteboards.classId,
            title: whiteboards.title,
            ownerId: whiteboards.ownerId,
            data: whiteboards.data,
            createdAt: whiteboards.createdAt,
            updatedAt: whiteboards.updatedAt,
          })

  const [latestSnapshot] = await db
    .select({
      id: whiteboardSnapshots.id,
      document: whiteboardSnapshots.document,
      version: whiteboardSnapshots.version,
      updatedAt: whiteboardSnapshots.updatedAt,
    })
    .from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.boardId, board.id))
    .limit(1)

  return (
    <PageContainer width="canvas">
      <WhiteboardPageClient
        className={classData[0].title}
        currentUser={currentUser}
        initialData={{
          board: {
            id: board.id,
            classId: board.classId,
            title: board.title,
            ownerId: board.ownerId,
            createdAt: board.createdAt.toISOString(),
            updatedAt: board.updatedAt.toISOString(),
          },
          snapshot: {
            id: latestSnapshot?.id ?? `snapshot-${board.id}`,
            boardId: board.id,
            version: latestSnapshot?.version ?? 0,
            document: (latestSnapshot?.document as never) ?? null,
            legacyData: board.data,
            updatedAt: latestSnapshot?.updatedAt?.toISOString() ?? null,
          },
        }}
      />
    </PageContainer>
  )
}