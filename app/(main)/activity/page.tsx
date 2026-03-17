import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { getActivityLog } from "@/lib/activity"
import { type ActivityCategory, activityFilters } from "@/lib/activity-ui"
import { ActivityPageClient } from "@/components/activity/activity-page-client"

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
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const params = await searchParams
  const filter = activityFilters.some((item) => item.value === params.filter)
    ? (params.filter as ActivityCategory)
    : "all"

  const log = await getActivityLog(session.user.id, {
    limit: 50,
    category: filter,
    cursor: params.cursor ?? null,
  })

  return (
    <ActivityPageClient
      activeFilter={filter}
      items={log.items}
      nextCursor={log.nextCursor}
    />
  )
}
