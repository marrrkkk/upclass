"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { resources } from "@/db/schema"
import { auth } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { getAuthorizedResourceForUser, getClassMembershipForUser } from "@/lib/resources/auth"
import { getResourceFileUrl } from "@/lib/resources/file-url"
import { ingestResourceDocument } from "@/lib/resources/ingest"
import { removeStorageObjects } from "@/lib/storage/server"
import { getResourceFileType } from "@/lib/storage/shared"
import {
  createResourceSchema,
  updateResourceSchema,
} from "@/lib/validation/actions"
import { parseFormData } from "@/lib/validation/form-data"

type ActionResponse =
  | {
      success: true
      resourceId?: string
      ingestionStatus?: "ready" | "failed" | "unsupported"
      warning?: string
    }
  | { success: false; error: string }

function revalidateResourceSurfaces(classId: string, resourceId?: string) {
  revalidatePath("/resources")
  revalidatePath("/home")
  revalidatePath("/activity")
  revalidatePath(`/classes/${classId}`)
  revalidatePath(`/classes/${classId}?tab=resources`)

  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`)
  }
}

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

  const {
    classId,
    title,
    description,
    category,
    fileName,
    fileSize,
    mimeType,
    storageBucket,
    storagePath,
  } = parsed.data

  const membership = await getClassMembershipForUser(session.user.id, classId)
  if (!membership || membership.role !== "teacher") {
    return { success: false, error: "Only teachers can upload class resources" }
  }

  const resourceId = crypto.randomUUID()

  try {
    await db.insert(resources).values({
      id: resourceId,
      classId,
      title,
      description,
      category,
      fileUrl: getResourceFileUrl(resourceId),
      fileName,
      fileType: getResourceFileType(fileName),
      mimeType,
      fileSize,
      storageBucket,
      storagePath,
      ownerId: session.user.id,
    })

    const ingestionResult = await ingestResourceDocument(resourceId, session.user.id)
    revalidateResourceSurfaces(classId, resourceId)

    await logActivity({
      actorId: session.user.id,
      eventType: "resource_uploaded",
      entityType: "resource",
      entityId: resourceId,
      classId,
      title: `Uploaded resource "${title}"`,
      description: description || fileName,
    })

    return {
      success: true,
      resourceId,
      ingestionStatus: ingestionResult.status,
      warning:
        ingestionResult.status === "ready"
          ? undefined
          : ingestionResult.message || "The file uploaded, but AI ingestion did not complete.",
    }
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
    const resource = await getAuthorizedResourceForUser(id, session.user.id)

    if (!resource) {
      return { success: false, error: "Resource not found" }
    }

    if (resource.membershipRole !== "teacher") {
      return { success: false, error: "Only teachers can edit class resources" }
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

    revalidateResourceSurfaces(resource.class.id, id)
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
    const resource = await getAuthorizedResourceForUser(resourceId, session.user.id)

    if (!resource) {
      return { success: false, error: "Resource not found" }
    }

    if (resource.membershipRole !== "teacher") {
      return { success: false, error: "Only teachers can delete class resources" }
    }

    await db.delete(resources).where(eq(resources.id, resourceId))
    await removeStorageObjects([
      {
        bucket: resource.storageBucket,
        path: resource.storagePath,
      },
    ])

    revalidateResourceSurfaces(resource.class.id, resourceId)
    return { success: true }
  } catch (error) {
    console.error("deleteResource error", error)
    return { success: false, error: "Failed to delete resource" }
  }
}

export async function reingestResource(resourceId: string): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const resource = await getAuthorizedResourceForUser(resourceId, session.user.id)

    if (!resource) {
      return { success: false, error: "Resource not found" }
    }

    if (resource.membershipRole !== "teacher") {
      return { success: false, error: "Only teachers can reprocess class resources" }
    }

    const ingestionResult = await ingestResourceDocument(resourceId, session.user.id)
    revalidateResourceSurfaces(resource.class.id, resourceId)

    return {
      success: true,
      resourceId,
      ingestionStatus: ingestionResult.status,
      warning: ingestionResult.status === "ready" ? undefined : ingestionResult.message,
    }
  } catch (error) {
    console.error("reingestResource error", error)
    return { success: false, error: "Failed to reprocess this resource" }
  }
}
