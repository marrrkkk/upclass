import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { classChannels, classMembership, classwork } from "@/db/schema"
import {
  createSignedStorageUpload,
  getPublicStorageUrl,
} from "@/lib/storage/server"
import {
  buildUploadPath,
  getBucketForPurpose,
  type UploadContext,
  type UploadFileMetadata,
  type UploadPurpose,
  validateUploadFiles,
} from "@/lib/storage/shared"

const uploadPurposeValues = [
  "profile-avatar",
  "profile-cover",
  "resource-file",
  "message-media",
  "channel-message-media",
  "submission-attachment",
] as const

const requestSchema = z.object({
  purpose: z.enum(uploadPurposeValues),
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1, "File name is required"),
        size: z.number().int().positive("File size is required"),
        type: z.string().trim().default("application/octet-stream"),
      }),
    )
    .min(1, "At least one file is required"),
  context: z
    .object({
      channelId: z.string().trim().optional(),
      classworkId: z.string().trim().optional(),
    })
    .optional(),
})

async function requireUploadAccess(userId: string, purpose: UploadPurpose, context?: UploadContext) {
  if (purpose === "channel-message-media") {
    if (!context?.channelId) {
      throw new Error("Channel ID is required")
    }

    const channel = await db
      .select({
        classId: classChannels.classId,
      })
      .from(classChannels)
      .where(eq(classChannels.id, context.channelId))
      .limit(1)

    if (channel.length === 0) {
      throw new Error("Channel not found")
    }

    const membership = await db
      .select({ id: classMembership.id })
      .from(classMembership)
      .where(
        and(
          eq(classMembership.classId, channel[0].classId),
          eq(classMembership.userId, userId),
        ),
      )
      .limit(1)

    if (membership.length === 0) {
      throw new Error("You do not have access to this channel")
    }
  }

  if (purpose === "submission-attachment") {
    if (!context?.classworkId) {
      throw new Error("Classwork ID is required")
    }

    const classworkRow = await db
      .select({
        classId: classwork.classId,
      })
      .from(classwork)
      .where(eq(classwork.id, context.classworkId))
      .limit(1)

    if (classworkRow.length === 0) {
      throw new Error("Classwork not found")
    }

    const membership = await db
      .select({ id: classMembership.id })
      .from(classMembership)
      .where(
        and(
          eq(classMembership.classId, classworkRow[0].classId),
          eq(classMembership.userId, userId),
          eq(classMembership.role, "student"),
        ),
      )
      .limit(1)

    if (membership.length === 0) {
      throw new Error("Only students can upload submission attachments")
    }
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: z.infer<typeof requestSchema>

  try {
    payload = requestSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid upload request"
        : "Invalid upload request"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    await requireUploadAccess(session.user.id, payload.purpose, payload.context)
    validateUploadFiles(payload.purpose, payload.files as UploadFileMetadata[])

    const uploads = await Promise.all(
      payload.files.map(async (file) => {
        const bucket = getBucketForPurpose(payload.purpose)
        const path = buildUploadPath(payload.purpose, session.user.id, file, payload.context)
        const token = await createSignedStorageUpload(bucket, path)
        const publicUrl = getPublicStorageUrl(bucket, path)

        return {
          bucket,
          path,
          token,
          publicUrl,
          name: file.name,
          size: file.size,
          type: file.type,
        }
      }),
    )

    return NextResponse.json({ uploads })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare upload"
    const status = /unauthorized|access/i.test(message) ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
