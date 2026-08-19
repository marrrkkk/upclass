/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { headers } from "next/headers"
import { eq, and, ne } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { notifications, classMembership, user, classes } from "@/db/schema"
import { revalidateUserOrgs } from "@/lib/server/revalidate"
import { deliverClassNotifications } from "@/lib/notifications/delivery"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

export async function markNotificationAsRead(notificationId: string): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, session.user.id),
        ),
      )

    await revalidateUserOrgs(session.user.id, ["notifications"])
    return { success: true }
  } catch (error) {
    console.error("markNotificationAsRead error", error)
    return { success: false, error: "Failed to mark notification as read" }
  }
}

export async function markAllNotificationsAsRead(): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, session.user.id))

    await revalidateUserOrgs(session.user.id, ["notifications"])
    return { success: true }
  } catch (error) {
    console.error("markAllNotificationsAsRead error", error)
    return { success: false, error: "Failed to mark all notifications as read" }
  }
}

// Helper function to create notifications for all students in a class
export async function createNotificationsForClass(
  classId: string,
  type: "announcement" | "classwork",
  title: string,
  message: string,
  relatedId: string,
  excludeUserId?: string,
): Promise<void> {
  try {
    // Get all student members of the class with their notification settings
    const whereConditions: any[] = [
      eq(classMembership.classId, classId),
      eq(classMembership.role, "student"),
    ]
    
    if (excludeUserId) {
      whereConditions.push(ne(classMembership.userId, excludeUserId))
    }

    const members = await db
      .select({
        userId: classMembership.userId,
        email: user.email,
        classNotifications: user.classNotifications,
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
      })
      .from(classMembership)
      .innerJoin(user, eq(classMembership.userId, user.id))
      .where(and(...whereConditions))

    const [classRecord] = await db
      .select({ title: classes.title })
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1)

    await deliverClassNotifications({
      recipients: members.map((member) => ({
        userId: member.userId,
        email: member.email,
        classNotifications: member.classNotifications !== false,
        emailNotifications: member.emailNotifications !== false,
        pushNotifications: member.pushNotifications !== false,
      })),
      type,
      title,
      message,
      classId,
      classTitle: classRecord?.title ?? null,
      relatedId,
    })
  } catch (error) {
    console.error("createNotificationsForClass error", error)
  }
}
