"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and, desc, isNotNull } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import {
  orgResource,
  orgMembership,
  classMembership,
  resources,
} from "@/db/schema"

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

type UploadOrgResourceInput = {
  title: string
  description?: string
  category?: string
  fileUrl: string
  fileName: string
  fileSize?: string
}

/**
 * Map file extension to the resource_file_type enum value.
 */
function getFileType(
  fileName: string
): "pdf" | "ppt" | "pptx" | "doc" | "docx" | "xls" | "xlsx" | "txt" | "other" {
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

/**
 * Upload a resource to the organization library.
 * Only teachers and admins may upload.
 * File size must be ≤ 50MB.
 */
export async function uploadOrgResource(
  orgId: string,
  input: UploadOrgResourceInput
): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify user is teacher or admin in the org
  const membership = await db
    .select()
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

  if (membership[0].role === "student") {
    return { success: false, error: "Insufficient permissions" }
  }

  // Validate file size
  if (input.fileSize) {
    const size = parseInt(input.fileSize, 10)
    if (!isNaN(size) && size > MAX_FILE_SIZE) {
      return { success: false, error: "File size exceeds 50MB limit" }
    }
  }

  // Validate required fields
  if (!input.title || !input.fileUrl || !input.fileName) {
    return { success: false, error: "Title, file URL, and file name are required" }
  }

  const resourceId = crypto.randomUUID()

  try {
    await db.insert(orgResource).values({
      id: resourceId,
      organizationId: orgId,
      title: input.title,
      description: input.description || null,
      category: input.category || "General",
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileType: getFileType(input.fileName),
      fileSize: input.fileSize || null,
      uploadedBy: session.user.id,
    })

    revalidatePath(`/`)

    return { success: true }
  } catch (error) {
    console.error("uploadOrgResource error", error)
    return { success: false, error: "Failed to upload resource" }
  }
}

/**
 * List all resources in the organization library.
 * Any org member may access. Results ordered by createdAt desc.
 */
export async function listOrgResources(
  orgId: string
): Promise<ActionResult<typeof orgResource.$inferSelect[]>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify user is an org member
  const membership = await db
    .select()
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

  try {
    const results = await db
      .select()
      .from(orgResource)
      .where(eq(orgResource.organizationId, orgId))
      .orderBy(desc(orgResource.createdAt))

    return { success: true, data: results }
  } catch (error) {
    console.error("listOrgResources error", error)
    return { success: false, error: "Failed to list resources" }
  }
}

/**
 * Publish a class resource to the organization library.
 * Requires teacher/admin in the org AND membership in the class.
 * Prevents double-publishing via the unique constraint on (organizationId, sourceResourceId).
 */
export async function publishClassResource(
  orgId: string,
  classId: string,
  resourceId: string
): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify user is teacher or admin in the org
  const membership = await db
    .select()
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

  if (membership[0].role === "student") {
    return { success: false, error: "Insufficient permissions" }
  }

  // Verify user is a member of the class
  const classMemb = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classId),
        eq(classMembership.userId, session.user.id)
      )
    )
    .limit(1)

  if (classMemb.length === 0) {
    return { success: false, error: "Not a member of this class" }
  }

  // Check if already published
  const existing = await db
    .select()
    .from(orgResource)
    .where(
      and(
        eq(orgResource.organizationId, orgId),
        eq(orgResource.sourceResourceId, resourceId)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    return { success: false, error: "Resource has already been published to the organization library" }
  }

  // Fetch the original resource
  const originalResource = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1)

  if (originalResource.length === 0) {
    return { success: false, error: "Resource not found" }
  }

  const original = originalResource[0]
  const newId = crypto.randomUUID()

  try {
    await db.insert(orgResource).values({
      id: newId,
      organizationId: orgId,
      title: original.title,
      description: original.description || null,
      category: original.category || "General",
      fileUrl: original.fileUrl,
      fileName: original.fileName,
      fileType: original.fileType,
      fileSize: original.fileSize || null,
      uploadedBy: session.user.id,
      sourceClassId: classId,
      sourceResourceId: resourceId,
    })

    revalidatePath(`/`)

    return { success: true }
  } catch (error) {
    console.error("publishClassResource error", error)
    return { success: false, error: "Failed to publish resource" }
  }
}
