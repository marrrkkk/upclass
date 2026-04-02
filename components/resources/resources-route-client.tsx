"use client"

import { useEffect, useMemo, useRef } from "react"
import { useQuery } from "@tanstack/react-query"

import { AuthRequiredCard } from "@/components/auth-required-card"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { QueryErrorCard } from "@/components/query-error-card"
import { mainAppQueries } from "@/lib/main-app-queries"
import { ResourcesClient } from "@/components/resources/resources-client"
import { ResourcesPageWrapper } from "@/components/resources/resources-page-wrapper"

const LEGACY_UPLOAD_URL_PATTERN = /(uploadthing|utfs\.io|ufs\.sh)/i

export function ResourcesRouteClient() {
  const { isAuthenticated, isShellResolved, userId } = useMainShellState()
  const resourcesQuery = useQuery({
    ...mainAppQueries.resources(userId),
    enabled: Boolean(isAuthenticated && userId),
  })
  const healedLegacyCacheRef = useRef(false)
  const resources = useMemo(() => resourcesQuery.data?.resources ?? [], [resourcesQuery.data?.resources])
  const managedClasses = useMemo(
    () => resourcesQuery.data?.managedClasses ?? [],
    [resourcesQuery.data?.managedClasses],
  )
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

  if (!isShellResolved) {
    return <ResourcesPageWrapper isAuthenticated={false}><ResourcesClient resources={[]} isLoading /></ResourcesPageWrapper>
  }

  if (!isAuthenticated || !userId) {
    return (
      <ResourcesPageWrapper isAuthenticated={false}>
        <AuthRequiredCard
          title="Sign in to open resources"
          description="Class resources and AI study support are available after you sign in."
        />
      </ResourcesPageWrapper>
    )
  }

  return (
    <ResourcesPageWrapper isAuthenticated={isAuthenticated} managedClasses={managedClasses}>
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
          managedClasses={managedClasses}
          isAuthenticated={isAuthenticated}
          isLoading={!resourcesQuery.data && resourcesQuery.isPending}
        />
      )}
    </ResourcesPageWrapper>
  )
}
