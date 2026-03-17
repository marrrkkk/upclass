import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { WhiteboardClient } from "@/components/whiteboard/whiteboard-client"
import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classes, classMembership, user, whiteboards } from "@/db/schema"

export const revalidate = 0 // Always fresh for whiteboard shell; content is realtime

export default async function WhiteboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/home")
  }

  const userId = session.user.id

  // Fetch class info, membership+user, and existing whiteboard in parallel
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
        data: whiteboards.data,
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
    redirect("/classes")
  }

  const currentUser = {
    id: membershipWithUser[0].userId,
    name: membershipWithUser[0].name,
    image: membershipWithUser[0].image,
  }

  // Create whiteboard only if it doesn't exist yet
  const [whiteboardRow] =
    existingWhiteboard.length > 0
      ? existingWhiteboard
      : await db
          .insert(whiteboards)
          .values({
            id: crypto.randomUUID(),
            classId: id,
            data: JSON.stringify([]), // Empty whiteboard
          })
          .returning({
            id: whiteboards.id,
            classId: whiteboards.classId,
            data: whiteboards.data,
            updatedAt: whiteboards.updatedAt,
          })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8">
      <WhiteboardClient
        whiteboardId={whiteboardRow.id}
        classId={id}
        className={classData[0].title}
        classColor={classData[0].color || "#3b82f6"}
        initialData={whiteboardRow.data}
        initialUpdatedAt={whiteboardRow.updatedAt?.toISOString?.() ?? null}
        currentUser={currentUser}
      />
    </div>
  )
}
