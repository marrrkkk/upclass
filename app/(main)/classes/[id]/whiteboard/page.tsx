import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { classes, classMembership, whiteboards, user } from "@/db/schema"
import { WhiteboardClient } from "@/components/whiteboard/whiteboard-client"

export const revalidate = 0 // Always fresh for whiteboard

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

  // Get class data
  const classData = await db
    .select({
      id: classes.id,
      title: classes.title,
      color: classes.color,
    })
    .from(classes)
    .where(eq(classes.id, id))
    .limit(1)

  if (classData.length === 0) {
    notFound()
  }

  // Check if user is a member
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, id),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    redirect("/classes")
  }

  // Get or create whiteboard for this class
  let whiteboard = await db
    .select()
    .from(whiteboards)
    .where(eq(whiteboards.classId, id))
    .limit(1)

  if (whiteboard.length === 0) {
    // Create new whiteboard
    const newWhiteboardId = crypto.randomUUID()
    await db.insert(whiteboards).values({
      id: newWhiteboardId,
      classId: id,
      data: JSON.stringify([]), // Empty whiteboard
    })
    whiteboard = await db
      .select()
      .from(whiteboards)
      .where(eq(whiteboards.id, newWhiteboardId))
      .limit(1)
  }

  // Get current user info
  const currentUser = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  // Get all members for cursor display
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
    })
    .from(classMembership)
    .innerJoin(user, eq(classMembership.userId, user.id))
    .where(eq(classMembership.classId, id))

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <WhiteboardClient
        whiteboardId={whiteboard[0].id}
        classId={id}
        className={classData[0].title}
        classColor={classData[0].color || "#3b82f6"}
        initialData={whiteboard[0].data}
        currentUser={currentUser[0]}
        members={members}
      />
    </div>
  )
}

