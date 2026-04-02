import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { classMembership, classes, resourceDocuments, resources, user } from "@/db/schema"

export async function getClassMembershipForUser(userId: string, classId: string) {
  const memberships = await db
    .select({
      classId: classMembership.classId,
      role: classMembership.role,
    })
    .from(classMembership)
    .where(
      and(eq(classMembership.classId, classId), eq(classMembership.userId, userId)),
    )
    .limit(1)

  return memberships[0] ?? null
}

export async function getAuthorizedResourceForUser(resourceId: string, userId: string) {
  const rows = await db
    .select({
      id: resources.id,
      classId: resources.classId,
      title: resources.title,
      description: resources.description,
      category: resources.category,
      fileUrl: resources.fileUrl,
      fileName: resources.fileName,
      fileType: resources.fileType,
      mimeType: resources.mimeType,
      fileSize: resources.fileSize,
      storageBucket: resources.storageBucket,
      storagePath: resources.storagePath,
      ownerId: resources.ownerId,
      createdAt: resources.createdAt,
      updatedAt: resources.updatedAt,
      class: {
        id: classes.id,
        title: classes.title,
        color: classes.color,
      },
      owner: {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      },
      membershipRole: classMembership.role,
      aiStatus: resourceDocuments.status,
      aiLastError: resourceDocuments.lastError,
      aiChunkCount: resourceDocuments.chunkCount,
      aiUpdatedAt: resourceDocuments.updatedAt,
    })
    .from(resources)
    .innerJoin(classMembership, eq(classMembership.classId, resources.classId))
    .innerJoin(classes, eq(classes.id, resources.classId))
    .innerJoin(user, eq(user.id, resources.ownerId))
    .leftJoin(resourceDocuments, eq(resourceDocuments.resourceId, resources.id))
    .where(and(eq(resources.id, resourceId), eq(classMembership.userId, userId)))
    .limit(1)

  return rows[0] ?? null
}
