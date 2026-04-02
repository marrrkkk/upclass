"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { resources } from "@/db/schema"
import { logActivity } from "@/lib/activity"
import { getResourceFileType } from "@/lib/storage/shared"
import { removeStorageObjects } from "@/lib/storage/server"
import {
  createResourceSchema,
  updateResourceSchema,
} from "@/lib/validation/actions"
import { parseFormData } from "@/lib/validation/form-data"

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

  const parsed = parseFormData(createResourceSchema, formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid resource data" }
  }

  const { title, description, category, fileUrl, fileName, fileSize, mimeType, storageBucket, storagePath } = parsed.data

  const resourceId = crypto.randomUUID()

  try {
    await db.insert(resources).values({
      id: resourceId,
      title,
      description,
      category,
      fileUrl,
      fileName,
      fileType: getResourceFileType(fileName),
      mimeType,
      fileSize,
      storageBucket,
      storagePath,
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

  const parsed = parseFormData(updateResourceSchema, formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid resource data" }
  }

  const { id, title, description, category } = parsed.data

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

    const resourceToDelete = existingResource[0]
    await db.delete(resources).where(eq(resources.id, resourceId))
    await removeStorageObjects([
      {
        bucket: resourceToDelete.storageBucket,
        path: resourceToDelete.storagePath,
      },
    ])

    revalidatePath("/resources")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("deleteResource error", error)
    return { success: false, error: "Failed to delete resource" }
  }
}
