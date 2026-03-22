"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import {
  announcements,
  announcementReactions,
  classMembership,
  classwork,
  gradingHistory,
  submissionAttachments,
  submissionRevisions,
  submissions,
} from "@/db/schema"
import { createNotificationsForClass } from "@/app/actions/notifications"
import { logActivity } from "@/lib/activity"
import { gradeSubmissionSchema } from "@/lib/validation/actions"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

type SubmissionAttachmentInput = {
  fileUrl: string
  fileName: string
  fileType?: string | null
  fileSize?: string | null
}

function parseSubmissionAttachments(formData: FormData) {
  const rawAttachments = formData.get("attachments")

  if (typeof rawAttachments === "string" && rawAttachments.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawAttachments) as SubmissionAttachmentInput[]
      return parsed
        .filter((entry) => entry?.fileUrl?.trim() && entry?.fileName?.trim())
        .map((entry) => ({
          fileUrl: entry.fileUrl.trim(),
          fileName: entry.fileName.trim(),
          fileType: entry.fileType?.trim() || null,
          fileSize: entry.fileSize?.trim() || null,
        }))
    } catch (error) {
      console.warn("Failed to parse submission attachments", error)
    }
  }

  const fileUrl = (formData.get("fileUrl") as string | null)?.trim()
  const fileName = (formData.get("fileName") as string | null)?.trim()

  if (!fileUrl || !fileName) return []

  return [{ fileUrl, fileName, fileType: null, fileSize: null }]
}

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

    revalidatePath(`/classes/${classId}`)
    revalidatePath("/home")
    revalidatePath("/activity")

    await logActivity({
      actorId: session.user.id,
      eventType: "announcement_created",
      entityType: "announcement",
      entityId: announcementId,
      classId,
      title: "Posted a class announcement",
      description: content.length > 120 ? `${content.slice(0, 120)}...` : content,
    })

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
  const rawType = formData.get("type") as string | null
  const type: "assignment" | "quiz" | "material" =
    rawType === "material" || rawType === "quiz" ? rawType : "assignment"
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
      type,
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

    revalidatePath(`/classes/${classId}`)
    revalidatePath("/home")
    revalidatePath("/activity")

    await logActivity({
      actorId: session.user.id,
      eventType:
        type === "material"
          ? "material_created"
          : type === "quiz"
            ? "quiz_created"
            : "assignment_created",
      entityType: "classwork",
      entityId: classworkId,
      classId,
      title: `Created ${type === "material" ? "material" : type} "${title}"`,
      description: description || null,
    })

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

  const content = (formData.get("content") as string | null)?.trim() || ""
  const mode = (formData.get("mode") as string | null) === "draft" ? "draft" : "submit"
  const attachments = parseSubmissionAttachments(formData)

  if (!content && attachments.length === 0) {
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
    let submissionEvent: "draft_saved" | "assignment_submitted" | "assignment_resubmitted" =
      mode === "draft" ? "draft_saved" : "assignment_submitted"

    const savedSubmissionId = await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.classworkId, classworkId),
            eq(submissions.studentId, session.user.id),
          ),
        )
        .limit(1)

      const firstAttachment = attachments[0] ?? null
      const previousSubmission = existing[0]
      const nextStatus = mode === "draft" ? "draft" : "submitted"
      const submissionId = previousSubmission?.id ?? crypto.randomUUID()
      const isResubmission =
        mode === "submit" &&
        (previousSubmission?.status === "submitted" || previousSubmission?.status === "graded")
      if (isResubmission) {
        submissionEvent = "assignment_resubmitted"
      }

      if (previousSubmission) {
        await tx
          .update(submissions)
          .set({
            content,
            fileUrl: firstAttachment?.fileUrl ?? null,
            fileName: firstAttachment?.fileName ?? null,
            status: nextStatus,
            submittedAt: mode === "submit" ? new Date() : previousSubmission.submittedAt,
            grade: mode === "submit" ? null : previousSubmission.grade,
            feedback: mode === "submit" ? null : previousSubmission.feedback,
            gradedAt: mode === "submit" ? null : previousSubmission.gradedAt,
          })
          .where(eq(submissions.id, submissionId))
      } else {
        await tx.insert(submissions).values({
          id: submissionId,
          classworkId,
          studentId: session.user.id,
          content,
          fileUrl: firstAttachment?.fileUrl ?? null,
          fileName: firstAttachment?.fileName ?? null,
          status: nextStatus,
          submittedAt: mode === "submit" ? new Date() : null,
        })
      }

      await tx.delete(submissionAttachments).where(eq(submissionAttachments.submissionId, submissionId))
      if (attachments.length > 0) {
        await tx.insert(submissionAttachments).values(
          attachments.map((attachment) => ({
            id: crypto.randomUUID(),
            submissionId,
            fileUrl: attachment.fileUrl,
            fileName: attachment.fileName,
            fileType: attachment.fileType ?? null,
            fileSize: attachment.fileSize ?? null,
          })),
        )
      }

      const revisionCount = await tx
        .select()
        .from(submissionRevisions)
        .where(eq(submissionRevisions.submissionId, submissionId))

      await tx.insert(submissionRevisions).values({
        id: crypto.randomUUID(),
        submissionId,
        revisionNumber: revisionCount.length + 1,
        action:
          mode === "draft"
            ? "draft_saved"
            : isResubmission
              ? "resubmitted"
              : "submitted",
        content,
        status: nextStatus,
        submittedAt: mode === "submit" ? new Date() : null,
        createdBy: session.user.id,
      })

      return submissionId
    })

    revalidatePath(`/classes/${classworkData[0].classId}`)
    revalidatePath("/home")
    revalidatePath("/activity")

    await logActivity({
      actorId: session.user.id,
      eventType: submissionEvent,
      entityType: "submission",
      entityId: savedSubmissionId,
      classId: classworkData[0].classId,
      title:
        mode === "draft"
          ? `Saved draft for "${classworkData[0].title}"`
          : `Submitted "${classworkData[0].title}"`,
      description: content || attachments[0]?.fileName || "Turned in classwork",
    })

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

  const parsed = gradeSubmissionSchema.safeParse({
    submissionId,
    grade: formData.get("grade"),
    feedback: formData.get("feedback"),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid grade" }
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
    await db.transaction(async (tx) => {
      await tx
        .update(submissions)
        .set({
          grade: parsed.data.grade,
          feedback: parsed.data.feedback ?? null,
          status: "graded",
          gradedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId))

      await tx.insert(gradingHistory).values({
        id: crypto.randomUUID(),
        submissionId,
        gradedBy: session.user.id,
        grade: parsed.data.grade,
        feedback: parsed.data.feedback ?? null,
      })
    })

    revalidatePath(`/classes/${classworkData[0].classId}`)
    revalidatePath("/home")
    revalidatePath("/activity")

    await logActivity({
      actorId: session.user.id,
      eventType: "submission_graded",
      entityType: "submission",
      entityId: submissionId,
      classId: classworkData[0].classId,
      title: `Graded "${classworkData[0].title}"`,
      description: parsed.data.feedback || `Recorded a grade of ${parsed.data.grade}`,
    })

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

    revalidatePath(`/classes/${classId}`)
    return { success: true }
  } catch (error) {
    console.error("toggleReaction error", error)
    return { success: false, error: "Failed to toggle reaction" }
  }
}

export async function updateAnnouncement(
  announcementId: string,
  content: string
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const announcementData = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, announcementId))
    .limit(1)

  if (announcementData.length === 0) {
    return { success: false, error: "Announcement not found" }
  }

  // Only author can edit
  if (announcementData[0].authorId !== session.user.id) {
    return { success: false, error: "Only the author can edit this announcement" }
  }

  try {
    await db
      .update(announcements)
      .set({ content, updatedAt: new Date() })
      .where(eq(announcements.id, announcementId))

    revalidatePath(`/classes/${announcementData[0].classId}`)
    return { success: true }
  } catch (error) {
    console.error("updateAnnouncement error", error)
    return { success: false, error: "Failed to update announcement" }
  }
}

export async function deleteAnnouncement(
  announcementId: string
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const announcementData = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, announcementId))
    .limit(1)

  if (announcementData.length === 0) {
    return { success: false, error: "Announcement not found" }
  }

  // Check if user is author or teacher
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, announcementData[0].classId),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  const isAuthor = announcementData[0].authorId === session.user.id
  const isTeacher = membership.length > 0 && membership[0].role === "teacher"

  if (!isAuthor && !isTeacher) {
    return { success: false, error: "Only the author or a teacher can delete this announcement" }
  }

  try {
    await db.delete(announcements).where(eq(announcements.id, announcementId))

    revalidatePath(`/classes/${announcementData[0].classId}`)
    return { success: true }
  } catch (error) {
    console.error("deleteAnnouncement error", error)
    return { success: false, error: "Failed to delete announcement" }
  }
}

export async function updateClasswork(
  classworkId: string,
  formData: FormData
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const classworkData = await db
    .select()
    .from(classwork)
    .where(eq(classwork.id, classworkId))
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
    return { success: false, error: "Only teachers can update classwork" }
  }

  const title = (formData.get("title") as string | null)?.trim()
  const description = (formData.get("description") as string | null)?.trim()
  const dueDate = formData.get("dueDate") as string | null
  const points = formData.get("points") as string | null

  if (!title) {
    return { success: false, error: "Title is required" }
  }

  try {
    await db
      .update(classwork)
      .set({
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        points,
        updatedAt: new Date(),
      })
      .where(eq(classwork.id, classworkId))

    revalidatePath(`/classes/${classworkData[0].classId}`)
    return { success: true }
  } catch (error) {
    console.error("updateClasswork error", error)
    return { success: false, error: "Failed to update classwork" }
  }
}

export async function deleteClasswork(
  classworkId: string
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const classworkData = await db
    .select()
    .from(classwork)
    .where(eq(classwork.id, classworkId))
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
    return { success: false, error: "Only teachers can delete classwork" }
  }

  try {
    await db.delete(classwork).where(eq(classwork.id, classworkId))

    revalidatePath(`/classes/${classworkData[0].classId}`)
    return { success: true }
  } catch (error) {
    console.error("deleteClasswork error", error)
    return { success: false, error: "Failed to delete classwork" }
  }
}

export async function removeMember(
  classId: string,
  memberId: string
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Check if current user is a teacher of this class
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
    return { success: false, error: "Only teachers can remove members" }
  }

  // Check if target is a student (can't remove teachers)
  const targetMembership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classId),
        eq(classMembership.userId, memberId),
      ),
    )
    .limit(1)

  if (targetMembership.length === 0) {
    return { success: false, error: "Member not found" }
  }

  if (targetMembership[0].role === "teacher") {
    return { success: false, error: "Cannot remove teachers from the class" }
  }

  try {
    await db
      .delete(classMembership)
      .where(eq(classMembership.id, targetMembership[0].id))

    revalidatePath(`/classes/${classId}`)
    return { success: true }
  } catch (error) {
    console.error("removeMember error", error)
    return { success: false, error: "Failed to remove member" }
  }
}
