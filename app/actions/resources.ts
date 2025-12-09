"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { resources } from "@/db/schema"

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
  const getFileType = (fileName: string, mimeType?: string): string => {
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
      fileType: getFileType(fileName, fileType) as any,
      fileSize,
      ownerId: session.user.id,
    })

    revalidatePath("/home/resources")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("createResource error", error)
    return { success: false, error: "Failed to create resource" }
  }
}

