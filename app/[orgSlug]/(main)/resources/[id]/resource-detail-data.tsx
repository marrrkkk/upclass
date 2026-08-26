import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { and, eq, ne } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { classes, organizations, resourceChunks, resources, user } from "@/db/schema"
import { isSemanticSearchEnabled } from "@/lib/ai/policy"
import { cosineSimilarity } from "@/lib/ai/embeddings"
import { ResourceDetailClient } from "@/components/resources/resource-detail-client"
import { meanEmbedding } from "@/lib/resources/semantic-search"

type RelatedResource = {
  id: string
  title: string
  fileType: string
  fileName: string
}

/**
 * "Related resources" for the detail page: compares this resource's mean
 * chunk embedding against other org resources' chunk embeddings. Purely
 * best-effort — any failure returns an empty list.
 */
async function loadRelatedResources(orgId: string, resourceId: string): Promise<RelatedResource[]> {
  try {
    if (!isSemanticSearchEnabled()) return []

    const [targetChunks, candidates] = await Promise.all([
      db
        .select({ embedding: resourceChunks.embedding })
        .from(resourceChunks)
        .where(eq(resourceChunks.resourceId, resourceId))
        .limit(20),
      db
        .select({ id: resources.id })
        .from(resources)
        .where(and(eq(resources.orgId, orgId), ne(resources.id, resourceId)))
        .limit(60),
    ])
    const targetEmbedding = meanEmbedding(targetChunks.map((chunk) => chunk.embedding))
    if (!targetEmbedding || candidates.length === 0) return []

    const chunkRows = await db
      .select({
        resourceId: resourceChunks.resourceId,
        embedding: resourceChunks.embedding,
      })
      .from(resourceChunks)
      .where(eq(resourceChunks.orgId, orgId))
      .limit(1_500)
    if (chunkRows.length === 0) return []

    const byResource = new Map<string, Array<number[] | null>>()
    const candidateIds = new Set(candidates.map((candidate) => candidate.id))
    for (const row of chunkRows) {
      if (!candidateIds.has(row.resourceId)) continue
      const list = byResource.get(row.resourceId) ?? []
      if (list.length < 5) {
        list.push(row.embedding)
        byResource.set(row.resourceId, list)
      }
    }

    const scored = [...byResource.entries()]
      .map(([id, vectors]) => ({ id, embedding: meanEmbedding(vectors) }))
      .filter((entry): entry is { id: string; embedding: number[] } => Boolean(entry.embedding))
      .map((entry) => ({ id: entry.id, similarity: cosineSimilarity(targetEmbedding, entry.embedding) }))
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, 4)
      .filter((entry) => entry.similarity > 0.15)
    if (scored.length === 0) return []

    const rows = await db
      .select({ id: resources.id, title: resources.title, fileName: resources.fileName, fileType: resources.fileType })
      .from(resources)
      .where(and(eq(resources.orgId, orgId), ne(resources.id, resourceId)))
      .limit(200)
    const byId = new Map(rows.map((row) => [row.id, row]))
    return scored
      .map((entry) => byId.get(entry.id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => ({ id: row.id, title: row.title, fileName: row.fileName, fileType: row.fileType }))
  } catch {
    return []
  }
}

export async function ResourceDetailData({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const { orgSlug, id } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isAuthenticated = !!session?.user?.id

  // Get resource with owner info and optional class context - allow public viewing
  const resourceData = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      resourceType: resources.resourceType,
      classId: resources.classId,
      category: resources.category,
      fileUrl: resources.fileUrl,
      fileName: resources.fileName,
      fileType: resources.fileType,
      fileSize: resources.fileSize,
      ownerId: resources.ownerId,
      createdAt: resources.createdAt,
      updatedAt: resources.updatedAt,
      orgId: organizations.id,
      owner: {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      },
      classTitle: classes.title,
      classId2: classes.id,
    })
    .from(resources)
    .innerJoin(organizations, eq(resources.orgId, organizations.id))
    .innerJoin(user, eq(resources.ownerId, user.id))
    .leftJoin(classes, eq(resources.classId, classes.id))
    .where(and(eq(resources.id, id), eq(organizations.slug, orgSlug)))
    .limit(1)

  if (resourceData.length === 0) {
    notFound()
  }

  const resource = resourceData[0]
  const isOwner = isAuthenticated && resource.ownerId === session.user.id
  const relatedResources = isAuthenticated ? await loadRelatedResources(resource.orgId, resource.id) : []

  return (
    <ResourceDetailClient
      resource={{
        ...resource,
        resourceType: resource.resourceType || "other",
        createdAt: resource.createdAt?.toISOString() ?? "",
        updatedAt: resource.updatedAt?.toISOString() ?? "",
        class: resource.classTitle && resource.classId2
          ? {
              id: resource.classId2,
              title: resource.classTitle,
            }
          : null,
      }}
      isOwner={isOwner}
      orgSlug={orgSlug}
      viewerAuthenticated={isAuthenticated}
      relatedResources={relatedResources}
    />
  )
}
