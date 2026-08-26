"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classChannels, classes, classMembership, orgMembership, organizations } from "@/db/schema"
import { getOrganizationMembership } from "@/lib/org-validation"
import { revalidateClassOrg } from "@/lib/server/revalidate"
import { logActivity } from "@/lib/activity"
import {
  createClassSchema,
  joinClassSchema,
  updateClassSchema,
} from "@/lib/validation/actions"
import { parseFormData } from "@/lib/validation/form-data"
import { firstIssue } from "@/lib/validation/errors"
import { canCreateClass, canTeach, isPrivilegedOrgRole } from "@/lib/org-permissions"
import {
  CLASS_CODE_JOIN_RATE_LIMIT,
  CLASS_CODE_JOIN_RATE_WINDOW_SECONDS,
  generateClassCode,
} from "@/lib/classes/class-code"
import { cacheIncrement } from "@/lib/ai/cache-layer"
import type { OrgRole } from "@/types/organization"

type CreateClassResult = {
  classId: string
  code: string
  codeEnabled: boolean
}

type JoinByCodeResult = {
  orgSlug: string
  classId: string
  alreadyJoined: boolean
}

type ClassActionResponse<T = void> =
  | { success: true; classId?: string; data?: T }
  | { success: false; error: string }

export async function createClass(formData: FormData): Promise<ClassActionResponse<CreateClassResult>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const orgSlug = formData.get("orgSlug") as string | null

  if (!orgSlug) {
    return { success: false, error: "Organization is required" }
  }

  const organizationMembership = await getOrganizationMembership(session.user.id, orgSlug)
  if (!organizationMembership) {
    return { success: false, error: "You are not a member of this organization" }
  }

  if (!canCreateClass(organizationMembership.role as OrgRole)) {
    return { success: false, error: "Only teachers can create classes in this organization" }
  }

  const orgId = organizationMembership.orgId

  const parsed = parseFormData(createClassSchema, formData)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invalid class data") }
  }

  const { title, gradeLevel, customGrade, category, section, description, color, schedule } =
    parsed.data

  const classId = crypto.randomUUID()

  let classCode = generateClassCode()

  // Ensure code is unique (retry if needed)
  let codeExists = true
  while (codeExists) {
    const existing = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.code, classCode))
      .limit(1)
    if (existing.length === 0) {
      codeExists = false
    } else {
      classCode = generateClassCode()
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(classes).values({
        id: classId,
        orgId,
        title,
        description,
        // `category` is omitted when undefined so the DB default ("General")
        // applies for the full create form; the wizard supplies it explicitly.
        category,
        gradeLevel: gradeLevel ?? null,
        customGrade: gradeLevel === "other" ? customGrade : null,
        section,
        code: classCode,
        codeEnabled: true,
        color,
        schedule,
        ownerId: session.user.id,
      })

      await tx.insert(classMembership).values({
        id: crypto.randomUUID(),
        classId,
        userId: session.user.id,
        role: "teacher",
      })

      await tx.insert(classChannels).values({
        id: crypto.randomUUID(),
        classId,
        name: "General",
        slug: "general",
        isDefault: true,
        createdBy: session.user.id,
      })
    })

    revalidatePath(`/${orgSlug}/classes`)
    revalidatePath(`/${orgSlug}/dashboard`)
    revalidatePath(`/${orgSlug}/calendar`)

    // Build activity description with structured fields
    const gradeLevelLabel = gradeLevel === "other" && customGrade 
      ? customGrade 
      : gradeLevel 
        ? gradeLevel.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
        : null
    const activityDesc = [
      gradeLevelLabel,
      section,
      description,
    ].filter(Boolean).join(", ") || "Started a new class"

    await logActivity({
      actorId: session.user.id,
      eventType: "class_created",
      entityType: "class",
      entityId: classId,
      classId,
      title: `Created class "${title}"`,
      description: activityDesc,
    })

    return {
      success: true,
      classId,
      data: { classId, code: classCode, codeEnabled: true },
    }
  } catch (error) {
    console.error("createClass error", error)
    return { success: false, error: "Failed to create class" }
  }
}

export async function joinClass(formData: FormData): Promise<ClassActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = parseFormData(joinClassSchema, formData)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invalid class code") }
  }

  const { code } = parsed.data

  try {
    // Find class by code
    const classData = await db
      .select()
      .from(classes)
      .where(eq(classes.code, code))
      .limit(1)

    if (classData.length === 0) {
      return { success: false, error: "Invalid class code" }
    }

    if (!classData[0].codeEnabled) {
      return { success: false, error: "This class enrollment code has been disabled" }
    }

    const classId = classData[0].id
    const organizationMembership = await db
      .select({ id: orgMembership.id })
      .from(orgMembership)
      .where(and(eq(orgMembership.orgId, classData[0].orgId), eq(orgMembership.userId, session.user.id)))
      .limit(1)

    if (!organizationMembership.length) {
      return { success: false, error: "You must join this organization before joining its classes" }
    }

    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(classMembership)
      .where(
        and(
          eq(classMembership.classId, classId),
          eq(classMembership.userId, session.user.id),
        ),
      )
      .limit(1)

    if (existingMembership.length > 0) {
      return { success: true, classId }
    }

    // Add user as student
    await db.insert(classMembership).values({
      id: crypto.randomUUID(),
      classId,
      userId: session.user.id,
      role: "student",
    })

    await revalidateClassOrg(classId, ["classes", "home", "activity"])

    await logActivity({
      actorId: session.user.id,
      eventType: "class_joined",
      entityType: "class",
      entityId: classId,
      classId,
      title: `Joined class "${classData[0].title}"`,
      description: classData[0].description || "Joined a class using an invite code",
    })

    return { success: true, classId }
  } catch (error) {
    console.error("joinClass error", error)
    return { success: false, error: "Failed to join class" }
  }
}

export async function updateClass(classId: string, formData: FormData): Promise<ClassActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Check if user is the owner/teacher of the class
  const classData = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1)

  if (classData.length === 0) {
    return { success: false, error: "Class not found" }
  }

  if (classData[0].ownerId !== session.user.id) {
    return { success: false, error: "Only the class owner can update the class" }
  }

  const parsed = parseFormData(updateClassSchema, formData)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invalid class data") }
  }

  const { title, gradeLevel, customGrade, section, description, color, schedule } = parsed.data

  try {
    await db
      .update(classes)
      .set({
        title,
        description,
        gradeLevel,
        customGrade: gradeLevel === "other" ? customGrade : null,
        section,
        color,
        schedule,
      })
      .where(eq(classes.id, classId))

    await revalidateClassOrg(classId, ["classes", `classes/${classId}`, "home"])

    return { success: true }
  } catch (error) {
    console.error("updateClass error", error)
    return { success: false, error: "Failed to update class" }
  }
}

export async function deleteClass(classId: string): Promise<ClassActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Check if user is the owner of the class
  const classData = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1)

  if (classData.length === 0) {
    return { success: false, error: "Class not found" }
  }

  if (classData[0].ownerId !== session.user.id) {
    return { success: false, error: "Only the class owner can delete the class" }
  }

  try {
    // Delete the class (cascade will handle related data like memberships, announcements, etc.)
    await db.delete(classes).where(eq(classes.id, classId))

    await revalidateClassOrg(classId, ["classes", "home"])

    return { success: true }
  } catch (error) {
    console.error("deleteClass error", error)
    return { success: false, error: "Failed to delete class" }
  }
}

async function getClassWithOrg(classId: string) {
  const [row] = await db
    .select({
      id: classes.id,
      orgId: classes.orgId,
      ownerId: classes.ownerId,
      code: classes.code,
      codeEnabled: classes.codeEnabled,
      title: classes.title,
      orgSlug: organizations.slug,
    })
    .from(classes)
    .innerJoin(organizations, eq(classes.orgId, organizations.id))
    .where(eq(classes.id, classId))
    .limit(1)

  return row ?? null
}

async function canManageClassEnrollment(userId: string, classId: string): Promise<boolean> {
  const classRow = await getClassWithOrg(classId)
  if (!classRow) return false
  if (classRow.ownerId === userId) return true

  const [membership] = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(and(eq(orgMembership.orgId, classRow.orgId), eq(orgMembership.userId, userId)))
    .limit(1)

  if (!membership) return false
  const role = membership.role as OrgRole
  return role === "owner" || role === "admin" || (role === "teacher" && canTeach(role))
}

/** Join organization and class atomically via a reusable class enrollment code. */
export async function joinOrganizationAndClassByCode(data: {
  code: string
}): Promise<ClassActionResponse<JoinByCodeResult>> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = joinClassSchema.safeParse({ code: data.code })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid class code" }
  }

  const code = parsed.data.code
  const userId = session.user.id

  const rateCount = await cacheIncrement(
    `class-code-join:${userId}`,
    CLASS_CODE_JOIN_RATE_WINDOW_SECONDS,
  )
  if (rateCount > CLASS_CODE_JOIN_RATE_LIMIT) {
    return { success: false, error: "Too many attempts. Try again in a few minutes." }
  }

  try {
    const [classRow] = await db
      .select({
        id: classes.id,
        orgId: classes.orgId,
        title: classes.title,
        description: classes.description,
        codeEnabled: classes.codeEnabled,
        orgSlug: organizations.slug,
      })
      .from(classes)
      .innerJoin(organizations, eq(classes.orgId, organizations.id))
      .where(eq(classes.code, code))
      .limit(1)

    if (!classRow) {
      return { success: false, error: "Invalid class code" }
    }

    if (!classRow.codeEnabled) {
      return { success: false, error: "This class enrollment code has been disabled" }
    }

    const [existingOrgMembership] = await db
      .select({ id: orgMembership.id, role: orgMembership.role })
      .from(orgMembership)
      .where(and(eq(orgMembership.orgId, classRow.orgId), eq(orgMembership.userId, userId)))
      .limit(1)

    const [existingClassMembership] = await db
      .select({ id: classMembership.id })
      .from(classMembership)
      .where(and(eq(classMembership.classId, classRow.id), eq(classMembership.userId, userId)))
      .limit(1)

    if (existingClassMembership) {
      revalidatePath(`/${classRow.orgSlug}/classes/${classRow.id}`)
      revalidatePath(`/${classRow.orgSlug}/dashboard`)
      return {
        success: true,
        classId: classRow.id,
        data: { orgSlug: classRow.orgSlug, classId: classRow.id, alreadyJoined: true },
      }
    }

    await db.transaction(async (tx) => {
      if (!existingOrgMembership) {
        await tx.insert(orgMembership).values({
          id: crypto.randomUUID(),
          orgId: classRow.orgId,
          userId,
          role: "student",
        })
      }

      await tx.insert(classMembership).values({
        id: crypto.randomUUID(),
        classId: classRow.id,
        userId,
        role: "student",
      })
    })

    await revalidateClassOrg(classRow.id, ["classes", "home", "activity", "dashboard"])

    await logActivity({
      actorId: userId,
      eventType: "class_joined",
      entityType: "class",
      entityId: classRow.id,
      classId: classRow.id,
      title: `Joined class "${classRow.title}"`,
      description: classRow.description || "Joined a class using an enrollment code",
    })

    return {
      success: true,
      classId: classRow.id,
      data: { orgSlug: classRow.orgSlug, classId: classRow.id, alreadyJoined: false },
    }
  } catch (error) {
    console.error("joinOrganizationAndClassByCode error", error)
    return { success: false, error: "Failed to join class" }
  }
}

export async function regenerateClassEnrollmentCode(
  classId: string,
): Promise<ClassActionResponse<{ code: string }>> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const allowed = await canManageClassEnrollment(session.user.id, classId)
  if (!allowed) {
    return { success: false, error: "You don't have permission to manage this enrollment code" }
  }

  let nextCode = generateClassCode()
  let unique = false
  while (!unique) {
    const [existing] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.code, nextCode))
      .limit(1)
    if (!existing) unique = true
    else nextCode = generateClassCode()
  }

  try {
    await db
      .update(classes)
      .set({ code: nextCode, codeEnabled: true })
      .where(eq(classes.id, classId))

    await revalidateClassOrg(classId, [`classes/${classId}`])
    return { success: true, data: { code: nextCode } }
  } catch (error) {
    console.error("regenerateClassEnrollmentCode error", error)
    return { success: false, error: "Failed to regenerate enrollment code" }
  }
}

export async function setClassEnrollmentCodeEnabled(
  classId: string,
  enabled: boolean,
): Promise<ClassActionResponse<{ codeEnabled: boolean }>> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const allowed = await canManageClassEnrollment(session.user.id, classId)
  if (!allowed) {
    return { success: false, error: "You don't have permission to manage this enrollment code" }
  }

  try {
    await db.update(classes).set({ codeEnabled: enabled }).where(eq(classes.id, classId))
    await revalidateClassOrg(classId, [`classes/${classId}`])
    return { success: true, data: { codeEnabled: enabled } }
  } catch (error) {
    console.error("setClassEnrollmentCodeEnabled error", error)
    return { success: false, error: "Failed to update enrollment code" }
  }
}
