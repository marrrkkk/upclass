import type { Metadata } from "next"
import { Suspense } from "react"

import { ClassDetailSkeleton } from "@/components/skeletons"
import { ClassDetailData } from "./class-detail-data"

export function generateMetadata(): Metadata {
  return {
    title: "Class",
  }
}

export default function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>
  searchParams?: Promise<{ tab?: string }>
}) {
  return (
    <Suspense fallback={<ClassDetailSkeleton />}>
      <ClassDetailData params={params} searchParams={searchParams} />
    </Suspense>
  )
}