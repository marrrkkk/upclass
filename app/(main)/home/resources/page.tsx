import { headers } from "next/headers"
import { eq } from "drizzle-orm"

import { ResourcesClient } from "@/components/resources/resources-client"
import { ResourcesPageWrapper } from "@/components/resources/resources-page-wrapper"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { resources, user } from "@/db/schema"

export default async function ResourcesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return (
      <section className="flex-1">
        <p className="text-muted-foreground">Please sign in to view resources.</p>
      </section>
    )
  }

  const userId = session.user.id

  const resourcesList = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      category: resources.category,
      fileUrl: resources.fileUrl,
      fileName: resources.fileName,
      fileType: resources.fileType,
      fileSize: resources.fileSize,
      createdAt: resources.createdAt,
      authorName: user.name,
      authorImage: user.image
    })
    .from(resources)
    .innerJoin(user, eq(resources.ownerId, user.id))
    .orderBy(resources.createdAt)

  const mappedResources = resourcesList.map((resource) => ({
    ...resource,
    createdAt: resource.createdAt?.toISOString() ?? "",
    authorName: resource.authorName,
    authorImage: resource.authorImage,
  }))

  return (
    <ResourcesPageWrapper>
      <ResourcesClient resources={mappedResources} />
    </ResourcesPageWrapper>
  )
}

