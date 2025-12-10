import { headers } from "next/headers"
import { eq } from "drizzle-orm"

import { ResourcesClient } from "@/components/resources/resources-client"
import { ResourcesPageWrapper } from "@/components/resources/resources-page-wrapper"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { resources } from "@/db/schema"

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
    .select()
    .from(resources)
    .orderBy(resources.createdAt)

  const mappedResources = resourcesList.map((resource) => ({
    ...resource,
    createdAt: resource.createdAt?.toISOString() ?? "",
  }))

  return (
    <ResourcesPageWrapper>
      <ResourcesClient resources={mappedResources} />
    </ResourcesPageWrapper>
  )
}

