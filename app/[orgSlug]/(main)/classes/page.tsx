import type { Metadata } from "next"
import { Suspense } from "react"

import { ClassesBodySkeleton } from "@/components/skeletons"
import { ClassesData } from "./classes-data"

export const metadata: Metadata = {
  title: "Classes",
}

export default function ClassesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  return (
    <Suspense fallback={<ClassesBodySkeleton />}>
      <ClassesData params={params} />
    </Suspense>
  )
}