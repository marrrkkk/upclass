import type { Metadata } from "next"
import { Suspense } from "react"

import { DashboardOverviewSkeleton } from "@/components/skeletons"
import { PageContainer } from "@/components/ui/section"
import { DashboardData } from "./dashboard-data"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  return (
    <PageContainer width="content" className="py-4 md:py-6">
      <Suspense fallback={<DashboardOverviewSkeleton />}>
        <DashboardData params={params} />
      </Suspense>
    </PageContainer>
  )
}
