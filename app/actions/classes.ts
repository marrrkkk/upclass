"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classChannels, classes, classMembership, user } from "@/db/schema"
import { logActivity } from "@/lib/activity"
import {
  createClassSchema,
  joinClassSchema,
  updateClassSchema,
} from "@/lib/validation/actions"
import { parseFormData } from "@/lib/validation/form-data"

type ActionResponse =
  | { success: true; classId?: string }
  | { success: false; error: string }

export async function createClass(formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Check if user is a teacher
  const userData = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (userData.length === 0 || userData[0].role !== "teacher") {
    return { success: false, error: "Only teachers can create classes" }
  }

  const parsed = parseFormData(createClassSchema, formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid class data" }
  }

  const { title, description, category, color, schedule } = parsed.data

  const classId = crypto.randomUUID()

  // Generate a unique 6-character alphanumeric code
  const generateClassCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  let classCode = generateClassCode()

  // Ensure code is unique (retry if needed)
  let codeExists = true
  while (codeExists) {
    const existing = await db
      .select()
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
        title,
        description,
        category,
        code: classCode,
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

    revalidatePath("/classes")
    revalidatePath("/home")
    revalidatePath("/activity")

    await logActivity({
      actorId: session.user.id,
      eventType: "class_created",
      entityType: "class",
      entityId: classId,
      classId,
      title: `Created class "${title}"`,
      description: description || `Started a new ${category} class`,
    })

    return { success: true }
  } catch (error) {
    console.error("createClass error", error)
    return { success: false, error: "Failed to create class" }
  }
}

export async function joinClass(formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const userData = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (userData.length === 0 || userData[0].role !== "student") {
    return { success: false, error: "Only students can join classes" }
  }

  const parsed = parseFormData(joinClassSchema, formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid class code" }
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

    const classId = classData[0].id

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
      return { success: false, error: "You are already a member of this class" }
    }

    // Add user as student
    await db.insert(classMembership).values({
      id: crypto.randomUUID(),
      classId,
      userId: session.user.id,
      role: "student",
    })

    revalidatePath("/classes")
    revalidatePath("/home")
    revalidatePath("/activity")

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

export async function updateClass(classId: string, formData: FormData): Promise<ActionResponse> {
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
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid class data" }
  }

  const { title, description, category, color, schedule } = parsed.data

  try {
    await db
      .update(classes)
      .set({
        title,
        description,
        category,
        color,
        schedule,
      })
      .where(eq(classes.id, classId))

    revalidatePath(`/classes/${classId}`)
    revalidatePath("/classes")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("updateClass error", error)
    return { success: false, error: "Failed to update class" }
  }
}

export async function deleteClass(classId: string): Promise<ActionResponse> {
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

    revalidatePath("/classes")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("deleteClass error", error)
    return { success: false, error: "Failed to delete class" }
  }
}
