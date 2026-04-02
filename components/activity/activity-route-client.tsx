"use client"

import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"

import { ActivityPageClient } from "@/components/activity/activity-page-client"
import { AuthRequiredCard } from "@/components/auth-required-card"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { QueryErrorCard } from "@/components/query-error-card"
import { activityFilters, type ActivityCategory } from "@/lib/activity-ui"
import { mainAppQueries } from "@/lib/main-app-queries"

export function ActivityRouteClient() {
  const { isAuthenticated, isShellResolved, userId } = useMainShellState()
  const searchParams = useSearchParams()
  const filterParam = searchParams?.get("filter")
  const activeFilter = activityFilters.some((item) => item.value === filterParam)
    ? (filterParam as ActivityCategory)
    : "all"
  const cursor = searchParams?.get("cursor") ?? null
  const activityQuery = useQuery({
    ...mainAppQueries.activity(userId ?? "guest", activeFilter, cursor),
    enabled: Boolean(isAuthenticated && userId),
  })

  if (!isShellResolved) {
    return (
      <ActivityPageClient
        activeFilter={activeFilter}
        items={[]}
        nextCursor={null}
        isLoading
      />
    )
  }

  if (!isAuthenticated || !userId) {
    return (
      <AuthRequiredCard
        title="Sign in to view activity"
        description="Your personal activity timeline is only available after you sign in."
      />
    )
  }

  if (activityQuery.error && !activityQuery.data) {
    return (
      <QueryErrorCard
        title="Unable to load activity"
        description={activityQuery.error.message}
        onRetry={() => {
          void activityQuery.refetch()
        }}
      />
    )
  }

  return (
    <ActivityPageClient
      activeFilter={activeFilter}
      items={activityQuery.data?.items ?? []}
      nextCursor={activityQuery.data?.nextCursor ?? null}
      isLoading={!activityQuery.data && activityQuery.isPending}
    />
  )
}
