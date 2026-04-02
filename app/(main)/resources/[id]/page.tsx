import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ResourceDetailClient } from "@/components/resources/resource-detail-client"
import { auth } from "@/lib/auth"
import { getAuthorizedResourceForUser } from "@/lib/resources/auth"

export function generateMetadata(): Metadata {
  return {
    title: "Resource",
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

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const resource = await getAuthorizedResourceForUser(id, session.user.id)

  if (!resource) {
    notFound()
  }

  return (
    <ResourceDetailClient
      resource={{
        ...resource,
        createdAt: resource.createdAt?.toISOString() ?? "",
        updatedAt: resource.updatedAt?.toISOString() ?? "",
        aiUpdatedAt: resource.aiUpdatedAt?.toISOString() ?? null,
        aiStatus: resource.aiStatus ?? "processing",
        aiChunkCount: resource.aiChunkCount ?? 0,
      }}
      canManageResource={resource.membershipRole === "teacher"}
    />
  )
}
