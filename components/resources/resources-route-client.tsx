"use client"

import { useQuery } from "@tanstack/react-query"

import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { QueryErrorCard } from "@/components/query-error-card"
import { mainAppQueries } from "@/lib/main-app-queries"
import { ResourcesClient } from "@/components/resources/resources-client"
import { ResourcesPageWrapper } from "@/components/resources/resources-page-wrapper"

export function ResourcesRouteClient() {
  const { isAuthenticated, userId } = useMainShellState()
  const resourcesQuery = useQuery(mainAppQueries.resources(userId))

  return (
    <ResourcesPageWrapper isAuthenticated={isAuthenticated}>
      {resourcesQuery.error && !resourcesQuery.data ? (
        <QueryErrorCard
          title="Unable to load resources"
          description={resourcesQuery.error.message}
          onRetry={() => {
            void resourcesQuery.refetch()
          }}
        />
      ) : (
        <ResourcesClient
          resources={resourcesQuery.data?.resources ?? []}
          isAuthenticated={isAuthenticated}
          isLoading={!resourcesQuery.data && resourcesQuery.isPending}
        />
      )}
    </ResourcesPageWrapper>
  )
}
