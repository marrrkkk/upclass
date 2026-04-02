import { eq, or } from "drizzle-orm"

import { db } from "@/db"
import {
  channelMessages,
  classChannels,
  classwork,
  messages,
  resources,
  submissionAttachments,
  submissions,
  user,
} from "@/db/schema"

type StorageObjectRef = {
  bucket?: string | null
  path?: string | null
}

function normalizeRefs(refs: StorageObjectRef[]) {
  return refs.filter((ref) => ref.bucket && ref.path)
}

function parseMediaStorageRefs(media: string | null) {
  if (!media) return []

  try {
    const parsed = JSON.parse(media) as Array<{
      bucket?: string | null
      path?: string | null
    }>

    if (!Array.isArray(parsed)) {
      return []
    }

    return normalizeRefs(
      parsed.map((entry) => ({
        bucket: typeof entry?.bucket === "string" ? entry.bucket : null,
        path: typeof entry?.path === "string" ? entry.path : null,
      })),
    )
  } catch {
    return []
  }
}

export async function collectClassworkManagedStorageRefs(classworkId: string) {
  const attachmentRows = await db
    .select({
      bucket: submissionAttachments.storageBucket,
      path: submissionAttachments.storagePath,
    })
    .from(submissionAttachments)
    .innerJoin(submissions, eq(submissionAttachments.submissionId, submissions.id))
    .where(eq(submissions.classworkId, classworkId))

  return normalizeRefs(attachmentRows)
}

export async function collectClassManagedStorageRefs(classId: string) {
  const attachmentRows = await db
    .select({
      bucket: submissionAttachments.storageBucket,
      path: submissionAttachments.storagePath,
    })
    .from(submissionAttachments)
    .innerJoin(submissions, eq(submissionAttachments.submissionId, submissions.id))
    .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
    .where(eq(classwork.classId, classId))

  const channelMediaRows = await db
    .select({
      media: channelMessages.media,
    })
    .from(channelMessages)
    .innerJoin(classChannels, eq(channelMessages.channelId, classChannels.id))
    .where(eq(classChannels.classId, classId))

  return [
    ...normalizeRefs(attachmentRows),
    ...channelMediaRows.flatMap((row) => parseMediaStorageRefs(row.media)),
  ]
}

export async function collectUserManagedStorageRefs(userId: string) {
  const [profileRows, resourceRows, submissionRows, directMessageRows, channelMessageRows] = await Promise.all([
    db
      .select({
        imageBucket: user.imageStorageBucket,
        imagePath: user.imageStoragePath,
        coverBucket: user.coverStorageBucket,
        coverPath: user.coverStoragePath,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1),
    db
      .select({
        bucket: resources.storageBucket,
        path: resources.storagePath,
      })
      .from(resources)
      .where(eq(resources.ownerId, userId)),
    db
      .select({
        bucket: submissionAttachments.storageBucket,
        path: submissionAttachments.storagePath,
      })
      .from(submissionAttachments)
      .innerJoin(submissions, eq(submissionAttachments.submissionId, submissions.id))
      .where(eq(submissions.studentId, userId)),
    db
      .select({
        media: messages.media,
      })
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId))),
    db
      .select({
        media: channelMessages.media,
      })
      .from(channelMessages)
      .where(eq(channelMessages.senderId, userId)),
  ])

  const profileRefs =
    profileRows[0]
      ? normalizeRefs([
          {
            bucket: profileRows[0].imageBucket,
            path: profileRows[0].imagePath,
          },
          {
            bucket: profileRows[0].coverBucket,
            path: profileRows[0].coverPath,
          },
        ])
      : []

  return [
    ...profileRefs,
    ...normalizeRefs(resourceRows),
    ...normalizeRefs(submissionRows),
    ...directMessageRows.flatMap((row) => parseMediaStorageRefs(row.media)),
    ...channelMessageRows.flatMap((row) => parseMediaStorageRefs(row.media)),
  ]
}
