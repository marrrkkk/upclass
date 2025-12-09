"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and, desc, ne } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { notifications, classMembership } from "@/db/schema"

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

    revalidatePath("/home/notifications")
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

    revalidatePath("/home/notifications")
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
    // Get all student members of the class
    const whereConditions: any[] = [
      eq(classMembership.classId, classId),
      eq(classMembership.role, "student"),
    ]
    
    if (excludeUserId) {
      whereConditions.push(ne(classMembership.userId, excludeUserId))
    }

    const members = await db
      .select({ userId: classMembership.userId })
      .from(classMembership)
      .where(and(...whereConditions))

    // Create notifications for each student
    if (members.length > 0) {
      const notificationValues = members.map((member) => ({
        id: crypto.randomUUID(),
        userId: member.userId,
        type: type as any,
        title,
        message,
        classId,
        relatedId,
        read: false,
      }))

      await db.insert(notifications).values(notificationValues)
    }
  } catch (error) {
    console.error("createNotificationsForClass error", error)
  }
}

