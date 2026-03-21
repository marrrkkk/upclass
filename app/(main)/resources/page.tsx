import type { Metadata } from "next"
import { Suspense } from "react"
import { eq } from "drizzle-orm"

import { ResourcesClient } from "@/components/resources/resources-client"
import { ResourcesPageWrapper } from "@/components/resources/resources-page-wrapper"
import { ResourcesPageSkeleton } from "@/components/skeletons"
import { db } from "@/db"
import { resources, user } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"

export const metadata: Metadata = {
  title: "Resources",
}

export default async function ResourcesPage() {
  const session = await getOptionalSession()

  const isAuthenticated = !!session?.user?.id

  return (
    <ResourcesPageWrapper isAuthenticated={isAuthenticated}>
      <Suspense fallback={<ResourcesPageSkeleton />}>
        <ResourcesPageContent isAuthenticated={isAuthenticated} />
      </Suspense>
    </ResourcesPageWrapper>
  )
}

async function ResourcesPageContent({ isAuthenticated }: { isAuthenticated: boolean }) {
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
      authorImage: user.image,
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

  return <ResourcesClient resources={mappedResources} isAuthenticated={isAuthenticated} />
}
