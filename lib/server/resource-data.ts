import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { classes, classMembership, resourceDocuments, resources, user } from "@/db/schema"

export async function getManagedResourceClasses(userId: string) {
  const rows = await db
    .select({
      id: classes.id,
      title: classes.title,
      color: classes.color,
    })
    .from(classMembership)
    .innerJoin(classes, eq(classes.id, classMembership.classId))
    .where(
      and(eq(classMembership.userId, userId), eq(classMembership.role, "teacher")),
    )
    .orderBy(classes.title)

  return rows.map((row) => ({
    ...row,
    color: row.color || "#3b82f6",
  }))
}

export async function getAccessibleResourcesPageData(userId: string) {
  const [resourceRows, managedClasses] = await Promise.all([
    db
      .select({
        id: resources.id,
        classId: resources.classId,
        title: resources.title,
        description: resources.description,
        category: resources.category,
        fileUrl: resources.fileUrl,
        fileName: resources.fileName,
        fileType: resources.fileType,
        fileSize: resources.fileSize,
        createdAt: resources.createdAt,
        className: classes.title,
        classColor: classes.color,
        authorName: user.name,
        authorImage: user.image,
        aiStatus: resourceDocuments.status,
        aiChunkCount: resourceDocuments.chunkCount,
      })
      .from(resources)
      .innerJoin(classMembership, eq(classMembership.classId, resources.classId))
      .innerJoin(classes, eq(classes.id, resources.classId))
      .innerJoin(user, eq(user.id, resources.ownerId))
      .leftJoin(resourceDocuments, eq(resourceDocuments.resourceId, resources.id))
      .where(eq(classMembership.userId, userId))
      .orderBy(desc(resources.createdAt)),
    getManagedResourceClasses(userId),
  ])

  return {
    resources: resourceRows.map((resource) => ({
      ...resource,
      createdAt: resource.createdAt?.toISOString() ?? "",
      classColor: resource.classColor || "#3b82f6",
      aiStatus: resource.aiStatus ?? "processing",
      aiChunkCount: resource.aiChunkCount ?? 0,
    })),
    managedClasses,
  }
}

export async function getClassResourcesTabData(classId: string) {
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
      fileSize: resources.fileSize,
      createdAt: resources.createdAt,
      updatedAt: resources.updatedAt,
      authorName: user.name,
      authorImage: user.image,
      aiStatus: resourceDocuments.status,
      aiChunkCount: resourceDocuments.chunkCount,
      aiLastError: resourceDocuments.lastError,
    })
    .from(resources)
    .innerJoin(user, eq(user.id, resources.ownerId))
    .leftJoin(resourceDocuments, eq(resourceDocuments.resourceId, resources.id))
    .where(eq(resources.classId, classId))
    .orderBy(desc(resources.createdAt))

  return rows.map((resource) => ({
    ...resource,
    createdAt: resource.createdAt?.toISOString() ?? "",
    updatedAt: resource.updatedAt?.toISOString() ?? "",
    aiStatus: resource.aiStatus ?? "processing",
    aiChunkCount: resource.aiChunkCount ?? 0,
  }))
}
