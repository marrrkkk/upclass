"use client"

import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"

import { AuthRequiredCard } from "@/components/auth-required-card"
import { ClassDetailHero } from "@/components/classes/class-detail-hero"
import { ClassDetailContentClient } from "@/components/classes/class-detail-content-client"
import { ClassDetailTabProvider } from "@/components/classes/class-detail-tab-provider"
import { ClassDetailTabs } from "@/components/classes/class-detail-tabs"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { QueryErrorCard } from "@/components/query-error-card"
import { ClassDetailSkeleton, ClassDetailTabSkeleton } from "@/components/skeletons"
import { getVisibleClassTab } from "@/lib/classes/class-detail-tabs"
import { mainAppQueries } from "@/lib/main-app-queries"

export function ClassDetailRouteClient({ classId }: { classId: string }) {
  const { isAuthenticated, isShellResolved, userId } = useMainShellState()
  const searchParams = useSearchParams()
  const activeTab = getVisibleClassTab(searchParams?.get("tab"), "stream")
  const frameQuery = useQuery({
    ...mainAppQueries.classFrame(classId),
    enabled: Boolean(isAuthenticated && userId),
  })
  const tabQuery = useQuery({
    ...mainAppQueries.classTab(classId, activeTab),
    enabled: Boolean(frameQuery.data && isAuthenticated && userId),
  })

  if (!isShellResolved) {
    return <ClassDetailSkeleton />
  }

  if (!isAuthenticated || !userId) {
    return (
      <AuthRequiredCard
        title="Sign in to open this class"
        description="Class materials and discussions are available after you sign in."
      />
    )
  }

  if (!frameQuery.data && frameQuery.isPending) {
    return <ClassDetailSkeleton />
  }

  if (frameQuery.error || !frameQuery.data) {
    return (
      <QueryErrorCard
        title="Unable to open this class"
        description={frameQuery.error?.message ?? "The class could not be loaded."}
        onRetry={() => {
          void frameQuery.refetch()
        }}
      />
    )
  }

  const classColor = frameQuery.data.classData.color || "#3b82f6"

  return (
    <div className="flex flex-col gap-6 -mt-4">
      <ClassDetailHero
        classData={frameQuery.data.classData}
        classColor={classColor}
        userRole={frameQuery.data.userRole}
      />
      <ClassDetailTabProvider activeTab={activeTab} classId={frameQuery.data.classData.id}>
        <ClassDetailTabs
          activeTab={activeTab}
          classColor={classColor}
          classId={frameQuery.data.classData.id}
        />
        {tabQuery.data ? (
          <ClassDetailContentClient
            activeTab={activeTab}
            classData={frameQuery.data.classData}
            userId={frameQuery.data.userId}
            userRole={frameQuery.data.userRole}
            announcements={tabQuery.data.announcements}
            classwork={tabQuery.data.classwork}
            submissions={tabQuery.data.submissions}
            resources={tabQuery.data.resources}
            quizzes={tabQuery.data.quizzes}
            members={tabQuery.data.members}
          />
        ) : tabQuery.error ? (
          <QueryErrorCard
            title="Unable to load this class section"
            description={tabQuery.error.message}
            onRetry={() => {
              void tabQuery.refetch()
            }}
          />
        ) : (
          <ClassDetailTabSkeleton activeTab={activeTab} />
        )}
      </ClassDetailTabProvider>
    </div>
  )
}
