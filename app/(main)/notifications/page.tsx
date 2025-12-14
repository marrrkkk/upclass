import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq, desc } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { notifications, classes } from "@/db/schema"
import { NotificationsClient } from "@/components/notifications/notifications-client"

export const metadata: Metadata = {
  title: "Notifications",
}

export const revalidate = 10 // Revalidate every 10 seconds for notifications

export default async function NotificationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const userId = session.user.id

  // Fetch notifications with class info
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
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  const mappedNotifications = notificationsList.map((notif) => ({
    ...notif,
    createdAt: notif.createdAt?.toISOString() ?? "",
  }))

  return <NotificationsClient notifications={mappedNotifications} userId={userId} />
}

