import { redirect } from "next/navigation"
import { eq, desc } from "drizzle-orm"

import { NotificationsClient } from "@/components/notifications/notifications-client"
import { db } from "@/db"
import { classes, notifications } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"

export async function NotificationsData() {
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const notificationsList = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      classId: notifications.classId,
      relatedId: notifications.relatedId,
      read: notifications.read,
      createdAt: notifications.createdAt,
      className: classes.title,
    })
    .from(notifications)
    .leftJoin(classes, eq(notifications.classId, classes.id))
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  const mappedNotifications = notificationsList.map((notif) => ({
    ...notif,
    createdAt: notif.createdAt?.toISOString() ?? "",
  }))

  return (
    <NotificationsClient notifications={mappedNotifications} userId={session.user.id} showHeader={false} />
  )
}