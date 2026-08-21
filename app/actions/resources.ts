"use server"

import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { resources } from "@/db/schema"
import { getOrganizationMembership } from "@/lib/org-validation"
import { revalidateUserOrgs } from "@/lib/server/revalidate"
import { logActivity } from "@/lib/activity"
import {
  createResourceSchema,
  updateResourceSchema,
} from "@/lib/validation/actions"
import { parseFormData } from "@/lib/validation/form-data"
import { canTeach } from "@/lib/org-permissions"
import type { OrgRole } from "@/types/organization"

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
  const orgSlug = String(formData.get("orgSlug") || "")
  const membership = await getOrganizationMembership(session.user.id, orgSlug)
  if (!membership) return { success: false, error: "You are not a member of this organization" }
  if (!canTeach(membership.role as OrgRole)) {
    return { success: false, error: "Only teachers and organization admins can upload resources" }
  }

  const parsed = parseFormData(createResourceSchema, formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid resource data" }
  }

  const { title, description, resourceType, classId, fileUrl, fileName, fileSize, storagePath } = parsed.data

  // Only ever persist storage paths that point into the uploader's own
  // folder; anything else (foreign objects, URLs, traversal) is dropped so
  // later cleanup can never remove a file the uploader does not own.
  const ownerStoragePath =
    storagePath && storagePath.startsWith(`${session.user.id}/`) ? storagePath : null

  // If classId is provided, verify it belongs to this org and user has access
  if (classId) {
    const { classes } = await import("@/db/schema")
    const [classRecord] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(
        and(eq(classes.id, classId), eq(classes.orgId, membership.orgId))
      )
      .limit(1)

    if (!classRecord) {
      return { success: false, error: "Selected class not found or not accessible" }
    }
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
      resourceType,
      classId: classId || null,
      fileUrl,
      fileName,
      fileType: getFileType(fileName),
      fileSize,
      storagePath: ownerStoragePath,
      ownerId: session.user.id,
      orgId: membership.orgId,
    })
  } catch (error) {
    console.error("createResource error", error)
    // The file is already in storage; without a database row it is an orphan.
    // Remove it best-effort so failed creations do not leak uploads.
    if (ownerStoragePath) {
      try {
        const { removeStorageObject } = await import("@/lib/storage")
        await removeStorageObject("resources", ownerStoragePath)
      } catch (cleanupError) {
        console.error("createResource storage cleanup failed", cleanupError)
      }
    }
    return { success: false, error: "Failed to create resource" }
  }

  // Database row persisted; remaining work is best-effort and must not turn
  // a successful creation into a reported failure.
  try {
    await revalidateUserOrgs(session.user.id, ["resources", "home", "activity"])

    // Build activity description with resource type and optional class context
    let activityDescription = `${resourceType.replace(/_/g, " ")} · ${fileName}`
    if (classId) {
      // Fetch class info for activity log
      const { classes } = await import("@/db/schema")
      const [classInfo] = await db
        .select({ title: classes.title })
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1)

      if (classInfo) {
        activityDescription += ` · Linked to ${classInfo.title}`
      }
    }

    await logActivity({
      actorId: session.user.id,
      eventType: "resource_uploaded",
      entityType: "resource",
      entityId: resourceId,
      title: `Uploaded resource "${title}"`,
      description: activityDescription,
    })
  } catch (error) {
    console.error("createResource post-insert work failed", error)
  }

  return { success: true }
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

  const { id, title, description, resourceType, classId } = parsed.data

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

    // If classId is provided, verify it belongs to the same org
    if (classId) {
      const { classes } = await import("@/db/schema")
      const [classRecord] = await db
        .select({ id: classes.id, orgId: classes.orgId })
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1)

      if (!classRecord || classRecord.orgId !== existingResource[0].orgId) {
        return { success: false, error: "Selected class not found or not in the same organization" }
      }
    }

    await db
      .update(resources)
      .set({
        title,
        description,
        resourceType,
        classId: classId || null,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))

    await revalidateUserOrgs(session.user.id, ["resources", `resources/${id}`])

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
    // Verify user is the owner and get storage path
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

    // Delete from database first
    await db.delete(resources).where(eq(resources.id, resourceId))

    // Attempt storage cleanup if we have a storage path. Only remove objects
    // inside the owner's own folder; foreign or legacy truncated paths are
    // left untouched so cleanup can never delete someone else's file.
    const storagePath = existingResource[0].storagePath
    if (storagePath && storagePath.startsWith(`${session.user.id}/`)) {
      try {
        const { removeStorageObject } = await import("@/lib/storage")
        await removeStorageObject("resources", storagePath)
      } catch (storageError) {
        console.error("Storage cleanup failed:", storageError)
        // Don't fail the whole operation - database record is already deleted
      }
    }

    await revalidateUserOrgs(session.user.id, ["resources", "home"])

    return { success: true }
  } catch (error) {
    console.error("deleteResource error", error)
    return { success: false, error: "Failed to delete resource" }
  }
}
