"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { announcements, classwork, submissions, classMembership, announcementReactions } from "@/db/schema"
import { createNotificationsForClass } from "@/app/actions/notifications"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

export async function createAnnouncement(
  classId: string,
  formData: FormData,
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Check if user is a member of the class
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classId),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "You are not a member of this class" }
  }

  const content = (formData.get("content") as string | null)?.trim()

  if (!content) {
    return { success: false, error: "Content is required" }
  }

  try {
    const announcementId = crypto.randomUUID()
    await db.insert(announcements).values({
      id: announcementId,
      classId,
      authorId: session.user.id,
      content,
    })

    // Create notifications for all students in the class
    await createNotificationsForClass(
      classId,
      "announcement",
      "New announcement",
      content.length > 100 ? content.substring(0, 100) + "..." : content,
      announcementId,
      session.user.id, // Exclude the author
    )

    revalidatePath(`/home/classes/${classId}`)
    return { success: true }
  } catch (error) {
    console.error("createAnnouncement error", error)
    return { success: false, error: "Failed to create announcement" }
  }
}

export async function createClasswork(
  classId: string,
  formData: FormData,
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Check if user is a teacher
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classId),
        eq(classMembership.userId, session.user.id),
        eq(classMembership.role, "teacher"),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Only teachers can create classwork" }
  }

  const title = (formData.get("title") as string | null)?.trim()
  const description = (formData.get("description") as string | null)?.trim()
  const type = (formData.get("type") as string | null) || "assignment"
  const dueDateStr = formData.get("dueDate") as string | null
  const points = (formData.get("points") as string | null)?.trim()

  if (!title) {
    return { success: false, error: "Title is required" }
  }

  const dueDate = dueDateStr ? new Date(dueDateStr) : null

  try {
    const classworkId = crypto.randomUUID()
    await db.insert(classwork).values({
      id: classworkId,
      classId,
      title,
      description,
      type: type as any,
      dueDate,
      points,
    })

    // Create notifications for all students in the class
    const notificationMessage = `New ${type}: ${title}`
    await createNotificationsForClass(
      classId,
      "classwork",
      `New ${type}`,
      notificationMessage,
      classworkId,
      session.user.id, // Exclude the creator
    )

    revalidatePath(`/home/classes/${classId}`)
    return { success: true }
  } catch (error) {
    console.error("createClasswork error", error)
    return { success: false, error: "Failed to create classwork" }
  }
}

export async function submitClasswork(
  classworkId: string,
  formData: FormData,
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const content = (formData.get("content") as string | null)?.trim()
  const fileUrl = (formData.get("fileUrl") as string | null)?.trim()
  const fileName = (formData.get("fileName") as string | null)?.trim()

  if (!content && !fileUrl) {
    return { success: false, error: "Content or file is required" }
  }

  // Get classwork to find classId
  const classworkData = await db
    .select()
    .from(classwork)
    .where(eq(classwork.id, classworkId))
    .limit(1)

  if (classworkData.length === 0) {
    return { success: false, error: "Classwork not found" }
  }

  // Check if user is a student member
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classworkData[0].classId),
        eq(classMembership.userId, session.user.id),
        eq(classMembership.role, "student"),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Only students can submit classwork" }
  }

  try {
    // Check if submission already exists
    const existing = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.classworkId, classworkId),
          eq(submissions.studentId, session.user.id),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      // Update existing submission
      await db
        .update(submissions)
        .set({
          content,
          fileUrl,
          fileName,
          status: "submitted",
          submittedAt: new Date(),
        })
        .where(eq(submissions.id, existing[0].id))
    } else {
      // Create new submission
      await db.insert(submissions).values({
        id: crypto.randomUUID(),
        classworkId,
        studentId: session.user.id,
        content,
        fileUrl,
        fileName,
        status: "submitted",
        submittedAt: new Date(),
      })
    }

    revalidatePath(`/home/classes/${classworkData[0].classId}`)
    return { success: true }
  } catch (error) {
    console.error("submitClasswork error", error)
    return { success: false, error: "Failed to submit classwork" }
  }
}

export async function gradeSubmission(
  submissionId: string,
  formData: FormData,
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const grade = (formData.get("grade") as string | null)?.trim()
  const feedback = (formData.get("feedback") as string | null)?.trim()

  if (!grade) {
    return { success: false, error: "Grade is required" }
  }

  // Get submission to find classwork and classId
  const submissionData = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (submissionData.length === 0) {
    return { success: false, error: "Submission not found" }
  }

  const classworkData = await db
    .select()
    .from(classwork)
    .where(eq(classwork.id, submissionData[0].classworkId))
    .limit(1)

  if (classworkData.length === 0) {
    return { success: false, error: "Classwork not found" }
  }

  // Check if user is a teacher
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classworkData[0].classId),
        eq(classMembership.userId, session.user.id),
        eq(classMembership.role, "teacher"),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Only teachers can grade submissions" }
  }

  try {
    await db
      .update(submissions)
      .set({
        grade,
        feedback,
        status: "graded",
        gradedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId))

    revalidatePath(`/home/classes/${classworkData[0].classId}`)
    return { success: true }
  } catch (error) {
    console.error("gradeSubmission error", error)
    return { success: false, error: "Failed to grade submission" }
  }
}

export async function toggleReaction(
  announcementId: string,
  reaction: string = "like"
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Get announcement to find classId
  const announcementData = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, announcementId))
    .limit(1)

  if (announcementData.length === 0) {
    return { success: false, error: "Announcement not found" }
  }

  const classId = announcementData[0].classId

  // Check if user is a member
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classId),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "You are not a member of this class" }
  }

  try {
    const existing = await db
      .select()
      .from(announcementReactions)
      .where(
        and(
          eq(announcementReactions.announcementId, announcementId),
          eq(announcementReactions.userId, session.user.id),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      if (existing[0].reaction === reaction) {
        // Same reaction: Toggle off
        await db
          .delete(announcementReactions)
          .where(eq(announcementReactions.id, existing[0].id))
      } else {
        // Different reaction: Update
        await db
          .update(announcementReactions)
          .set({ reaction })
          .where(eq(announcementReactions.id, existing[0].id))
      }
    } else {
      // Toggle on
      await db.insert(announcementReactions).values({
        id: crypto.randomUUID(),
        announcementId,
        userId: session.user.id,
        reaction,
      })
    }

    revalidatePath(`/home/classes/${classId}`)
    return { success: true }
  } catch (error) {
    console.error("toggleReaction error", error)
    return { success: false, error: "Failed to toggle reaction" }
  }
}

