import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { eq, desc } from "drizzle-orm"

import { NotificationsContentSkeleton } from "@/components/skeletons"
import { db } from "@/db"
import { notifications, classes } from "@/db/schema"
import { NotificationsClient } from "@/components/notifications/notifications-client"
import { getOptionalSession } from "@/lib/server/auth"

export const metadata: Metadata = {
  title: "Notifications",
}

export default async function NotificationsPage() {
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-1 text-muted-foreground">
          Stay updated with your latest class activities.
        </p>
      </div>

      <Suspense fallback={<NotificationsContentSkeleton />}>
        <NotificationsPageContent userId={session.user.id} />
      </Suspense>
    </section>
  )
}

async function NotificationsPageContent({ userId }: { userId: string }) {
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

  return <NotificationsClient notifications={mappedNotifications} userId={userId} showHeader={false} />
}
