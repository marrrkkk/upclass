"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { resources } from "@/db/schema"
import { logActivity } from "@/lib/activity"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

export async function createResource(formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const title = (formData.get("title") as string | null)?.trim()
  const description = (formData.get("description") as string | null)?.trim()
  const category = (formData.get("category") as string | null)?.trim() || "General"
  const fileUrl = formData.get("fileUrl") as string | null
  const fileName = formData.get("fileName") as string | null
  const fileType = formData.get("fileType") as string | null
  const fileSize = formData.get("fileSize") as string | null

  if (!title) {
    return { success: false, error: "Title is required" }
  }

  if (!fileUrl || !fileName || !fileType) {
    return { success: false, error: "File information is required" }
  }

  // Map file extension to enum type
  const getFileType = (fileName: string): "pdf" | "ppt" | "pptx" | "doc" | "docx" | "xls" | "xlsx" | "txt" | "other" => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    if (ext === "pdf") return "pdf"
    if (ext === "ppt") return "ppt"
    if (ext === "pptx") return "pptx"
    if (ext === "doc") return "doc"
    if (ext === "docx") return "docx"
    if (ext === "xls") return "xls"
    if (ext === "xlsx") return "xlsx"
    if (ext === "txt") return "txt"
    return "other"
  }

  const resourceId = crypto.randomUUID()

  try {
    await db.insert(resources).values({
      id: resourceId,
      title,
      description,
      category,
      fileUrl,
      fileName,
      fileType: getFileType(fileName),
      fileSize,
      ownerId: session.user.id,
    })

    revalidatePath("/resources")
    revalidatePath("/home")
    revalidatePath("/activity")

    await logActivity({
      actorId: session.user.id,
      eventType: "resource_uploaded",
      entityType: "resource",
      entityId: resourceId,
      title: `Uploaded resource "${title}"`,
      description: description || fileName,
    })

    return { success: true }
  } catch (error) {
    console.error("createResource error", error)
    return { success: false, error: "Failed to create resource" }
  }
}

export async function updateResource(formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const id = formData.get("id") as string | null
  const title = (formData.get("title") as string | null)?.trim()
  const description = (formData.get("description") as string | null)?.trim()
  const category = (formData.get("category") as string | null)?.trim() || "General"

  if (!id) {
    return { success: false, error: "Resource ID is required" }
  }

  if (!title) {
    return { success: false, error: "Title is required" }
  }

  try {
    // Verify user is the owner
    const existingResource = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1)

    if (existingResource.length === 0) {
      return { success: false, error: "Resource not found" }
    }

    if (existingResource[0].ownerId !== session.user.id) {
      return { success: false, error: "Unauthorized: You can only edit your own resources" }
    }

    await db
      .update(resources)
      .set({
        title,
        description,
        category,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))

    revalidatePath("/resources")
    revalidatePath(`/resources/${id}`)

    return { success: true }
  } catch (error) {
    console.error("updateResource error", error)
    return { success: false, error: "Failed to update resource" }
  }
}

export async function deleteResource(resourceId: string): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify user is the owner
    const existingResource = await db
      .select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1)

    if (existingResource.length === 0) {
      return { success: false, error: "Resource not found" }
    }

    if (existingResource[0].ownerId !== session.user.id) {
      return { success: false, error: "Unauthorized: You can only delete your own resources" }
    }

    await db.delete(resources).where(eq(resources.id, resourceId))

    revalidatePath("/resources")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("deleteResource error", error)
    return { success: false, error: "Failed to delete resource" }
  }
}
