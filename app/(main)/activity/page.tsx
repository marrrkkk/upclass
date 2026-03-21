import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"

import { getActivityLog } from "@/lib/activity"
import { type ActivityCategory, activityFilters } from "@/lib/activity-ui"
import { ActivityPageClient } from "@/components/activity/activity-page-client"
import { DashboardHeaderSkeleton } from "@/components/skeletons"
import { getOptionalSession } from "@/lib/server/auth"

export const metadata: Metadata = {
  title: "Activity",
}

type ActivityPageProps = {
  searchParams: Promise<{
    filter?: string
    cursor?: string
  }>
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const params = await searchParams
  const filter = activityFilters.some((item) => item.value === params.filter)
    ? (params.filter as ActivityCategory)
    : "all"

  return (
    <Suspense fallback={<DashboardHeaderSkeleton />}>
      <ActivityPageContent
        activeFilter={filter}
        cursor={params.cursor ?? null}
        userId={session.user.id}
      />
    </Suspense>
  )
}

async function ActivityPageContent({
  activeFilter,
  cursor,
  userId,
}: {
  activeFilter: ActivityCategory
  cursor: string | null
  userId: string
}) {
  const log = await getActivityLog(userId, {
    limit: 50,
    category: activeFilter,
    cursor,
  })

  return (
    <ActivityPageClient
      activeFilter={activeFilter}
      items={log.items}
      nextCursor={log.nextCursor}
    />
  )
}
