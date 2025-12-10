"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classes, classMembership, user } from "@/db/schema"

type ActionResponse =
  | { success: true }
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

  const title = (formData.get("title") as string | null)?.trim()
  const description = (formData.get("description") as string | null)?.trim()
  const category = (formData.get("category") as string | null)?.trim() || "General"
  const color = (formData.get("color") as string | null)?.trim() || "#3b82f6"
  const schedule = (formData.get("schedule") as string | null)?.trim() || null

  if (!title) {
    return { success: false, error: "Title is required" }
  }

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
    })

    revalidatePath("/home/classes")
    revalidatePath("/home")

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

  const code = (formData.get("code") as string | null)?.trim().toUpperCase()

  if (!code) {
    return { success: false, error: "Class code is required" }
  }

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

    revalidatePath("/home/classes")
    revalidatePath("/home")

    return { success: true }
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

  const title = (formData.get("title") as string | null)?.trim()
  const description = (formData.get("description") as string | null)?.trim()
  const category = (formData.get("category") as string | null)?.trim() || "General"
  const color = (formData.get("color") as string | null)?.trim() || "#3b82f6"
  const schedule = (formData.get("schedule") as string | null)?.trim() || null

  if (!title) {
    return { success: false, error: "Title is required" }
  }

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

    revalidatePath(`/home/classes/${classId}`)
    revalidatePath("/home/classes")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("updateClass error", error)
    return { success: false, error: "Failed to update class" }
  }
}

