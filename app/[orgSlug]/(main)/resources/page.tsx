import type { Metadata } from "next"
import { Suspense } from "react"

import { ResourcesPageSkeleton } from "@/components/skeletons"
import { ResourcesData } from "./resources-data"

export const metadata: Metadata = {
  title: "Resources",
}

export default function ResourcesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  return (
    <Suspense fallback={<ResourcesPageSkeleton />}>
      <ResourcesData params={params} />
    </Suspense>
  )
}