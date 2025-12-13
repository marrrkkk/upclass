import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { eq } from "drizzle-orm"
import Link from "next/link"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { resources, user } from "@/db/schema"
import { ResourceDetailClient } from "@/components/resources/resource-detail-client"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const resourceData = await db
    .select({ title: resources.title })
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1)

  return {
    title: resourceData[0]?.title ?? "Resource",
  }
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isAuthenticated = !!session?.user?.id

  // Get resource with owner info - allow public viewing
  const resourceData = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
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
    })
    .from(resources)
    .innerJoin(user, eq(resources.ownerId, user.id))
    .where(eq(resources.id, id))
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
        createdAt: resource.createdAt?.toISOString() ?? "",
        updatedAt: resource.updatedAt?.toISOString() ?? "",
      }}
      isOwner={isOwner}
      currentUserId={session?.user?.id}
      isAuthenticated={isAuthenticated}
    />
  )
}

