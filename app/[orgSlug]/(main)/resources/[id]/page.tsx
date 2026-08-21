import type { Metadata } from "next"
import { Suspense } from "react"

import { ResourceDetailSkeleton } from "@/components/skeletons"
import { PageContainer } from "@/components/ui/section"
import { ResourceDetailData } from "./resource-detail-data"

export function generateMetadata(): Metadata {
  return {
    title: "Resource",
  }
}

export default function ResourceDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  return (
    <Suspense
      fallback={
        <PageContainer width="wide">
          <ResourceDetailSkeleton />
        </PageContainer>
      }
    >
      <ResourceDetailData params={params} />
    </Suspense>
  )
}