"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and, notInArray, inArray } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classes, classMembership, orgMembership } from "@/db/schema"
import { bulkEnrollSchema } from "@/lib/validation/organizations"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * List classes in the organization that the current user is not already enrolled in.
 * Student self-enrollment view — returns max 100 classes.
 */
export async function listAvailableClasses(
  orgId: string
): Promise<ActionResult<{ id: string; title: string; description: string | null; category: string | null }[]>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify user is an org member
  const membership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, session.user.id)
      )
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Not a member of this organization" }
  }

  // Get class IDs the user is already enrolled in
  const enrolledClasses = await db
    .select({ classId: classMembership.classId })
    .from(classMembership)
    .where(eq(classMembership.userId, session.user.id))

  const enrolledClassIds = enrolledClasses.map((c) => c.classId)

  // Get org classes not already enrolled in, limit 100
  const availableClasses = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
    })
    .from(classes)
    .where(
      enrolledClassIds.length > 0
        ? and(
            eq(classes.organizationId, orgId),
            notInArray(classes.id, enrolledClassIds)
          )
        : eq(classes.organizationId, orgId)
    )
    .limit(100)

  return { success: true, data: availableClasses }
}

/**
 * Student self-enrollment into an org class.
 * Validates org membership, class belongs to org, and not already enrolled.
 */
export async function selfEnroll(
  orgId: string,
  classId: string
): Promise<ActionResult<{ classId: string }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify user is a student in this org
  const membership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, session.user.id)
      )
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Not a member of this organization" }
  }

  if (membership[0].role !== "student") {
    return { success: false, error: "Self-enrollment is only available to students" }
  }

  // Verify class belongs to this org
  const classData = await db
    .select({ id: classes.id })
    .from(classes)
    .where(
      and(
        eq(classes.id, classId),
        eq(classes.organizationId, orgId)
      )
    )
    .limit(1)

  if (classData.length === 0) {
    return { success: false, error: "Class not available" }
  }

  // Check not already enrolled
  const existingMembership = await db
    .select({ id: classMembership.id })
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classId),
        eq(classMembership.userId, session.user.id)
      )
    )
    .limit(1)

  if (existingMembership.length > 0) {
    return { success: false, error: "Already enrolled in this class" }
  }

  try {
    await db.insert(classMembership).values({
      id: crypto.randomUUID(),
      classId,
      userId: session.user.id,
      role: "student",
    })

    revalidatePath("/classes")

    return { success: true, data: { classId } }
  } catch (error) {
    console.error("selfEnroll error", error)
    return { success: false, error: "Failed to complete enrollment" }
  }
}

/**
 * Bulk enroll students into a class. Teacher/admin only.
 * Validates all students are org members with student role.
 * Skips already-enrolled, reports failures.
 */
export async function bulkEnroll(
  orgId: string,
  classId: string,
  studentIds: string[]
): Promise<ActionResult<{ enrolled: number; skipped: number; failed: string[] }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Validate input with schema
  const parsed = bulkEnrollSchema.safeParse({ classId, studentIds })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }

  // Verify requester is teacher or admin in this org
  const requesterMembership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, session.user.id)
      )
    )
    .limit(1)

  if (requesterMembership.length === 0) {
    return { success: false, error: "Not a member of this organization" }
  }

  if (requesterMembership[0].role === "student") {
    return { success: false, error: "Insufficient permissions" }
  }

  // Verify class belongs to this org
  const classData = await db
    .select({ id: classes.id })
    .from(classes)
    .where(
      and(
        eq(classes.id, classId),
        eq(classes.organizationId, orgId)
      )
    )
    .limit(1)

  if (classData.length === 0) {
    return { success: false, error: "Class not found in this organization" }
  }

  // Get all org members with student role from the provided studentIds
  const validStudents = await db
    .select({ userId: orgMembership.userId })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.role, "student"),
        inArray(orgMembership.userId, studentIds)
      )
    )

  const validStudentIds = new Set(validStudents.map((s) => s.userId))

  // Determine failed (not valid org members with student role)
  const failed = studentIds.filter((id) => !validStudentIds.has(id))

  // Get already enrolled students among valid ones
  const validStudentArray = Array.from(validStudentIds)
  let alreadyEnrolledIds = new Set<string>()

  if (validStudentArray.length > 0) {
    const alreadyEnrolled = await db
      .select({ userId: classMembership.userId })
      .from(classMembership)
      .where(
        and(
          eq(classMembership.classId, classId),
          inArray(classMembership.userId, validStudentArray)
        )
      )

    alreadyEnrolledIds = new Set(alreadyEnrolled.map((m) => m.userId))
  }

  // Determine who to enroll (valid students not already enrolled)
  const toEnroll = validStudentArray.filter((id) => !alreadyEnrolledIds.has(id))
  const skipped = validStudentArray.length - toEnroll.length

  // Insert new class memberships
  if (toEnroll.length > 0) {
    try {
      await db.insert(classMembership).values(
        toEnroll.map((userId) => ({
          id: crypto.randomUUID(),
          classId,
          userId,
          role: "student" as const,
        }))
      )
    } catch (error) {
      console.error("bulkEnroll error", error)
      return { success: false, error: "Failed to complete bulk enrollment" }
    }
  }

  revalidatePath("/classes")

  return {
    success: true,
    data: {
      enrolled: toEnroll.length,
      skipped,
      failed,
    },
  }
}
