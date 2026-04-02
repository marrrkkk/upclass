"use client"

import { useQuery } from "@tanstack/react-query"

import { ClassesClient } from "@/components/classes/classes-client"
import { ClassesPageWrapper } from "@/components/classes/classes-page-wrapper"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { QueryErrorCard } from "@/components/query-error-card"
import { mainAppQueries } from "@/lib/main-app-queries"

export function ClassesRouteClient() {
  const { isAuthenticated, userId, userRole } = useMainShellState()
  const classesQuery = useQuery(mainAppQueries.classes(userId))

  return (
    <ClassesPageWrapper userRole={userRole} isAuthenticated={isAuthenticated}>
      {classesQuery.error && !classesQuery.data ? (
        <QueryErrorCard
          title="Unable to load classes"
          description={classesQuery.error.message}
          onRetry={() => {
            void classesQuery.refetch()
          }}
        />
      ) : (
        <ClassesClient
          teachingClasses={classesQuery.data?.teachingClasses ?? []}
          enrolledClasses={classesQuery.data?.enrolledClasses ?? []}
          userRole={userRole}
          isAuthenticated={isAuthenticated}
          isLoading={!classesQuery.data && classesQuery.isPending}
        />
      )}
    </ClassesPageWrapper>
  )
}
