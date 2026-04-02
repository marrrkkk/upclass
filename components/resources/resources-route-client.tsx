"use client"

import { useEffect, useMemo, useRef } from "react"
import { useQuery } from "@tanstack/react-query"

import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { QueryErrorCard } from "@/components/query-error-card"
import { mainAppQueries } from "@/lib/main-app-queries"
import { ResourcesClient } from "@/components/resources/resources-client"
import { ResourcesPageWrapper } from "@/components/resources/resources-page-wrapper"

const LEGACY_UPLOAD_URL_PATTERN = /(uploadthing|utfs\.io|ufs\.sh)/i

export function ResourcesRouteClient() {
  const { isAuthenticated, userId } = useMainShellState()
  const resourcesQuery = useQuery(mainAppQueries.resources(userId))
  const healedLegacyCacheRef = useRef(false)
  const resources = useMemo(() => resourcesQuery.data?.resources ?? [], [resourcesQuery.data?.resources])
  const refetchResources = resourcesQuery.refetch

  useEffect(() => {
    if (healedLegacyCacheRef.current) {
      return
    }

    if (!resources.length) {
      return
    }

    const hasLegacyResource = resources.some((resource) => LEGACY_UPLOAD_URL_PATTERN.test(resource.fileUrl))
    if (!hasLegacyResource) {
      return
    }

    healedLegacyCacheRef.current = true
    void refetchResources()
  }, [refetchResources, resources])

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
          resources={resources}
          isAuthenticated={isAuthenticated}
          isLoading={!resourcesQuery.data && resourcesQuery.isPending}
        />
      )}
    </ResourcesPageWrapper>
  )
}
