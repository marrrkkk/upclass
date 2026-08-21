import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { classes, organizations, resources, user } from "@/db/schema"
import { ResourceDetailClient } from "@/components/resources/resource-detail-client"

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
    />
  )
}
