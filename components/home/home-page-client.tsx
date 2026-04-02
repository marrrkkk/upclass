"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { GraduationCap } from "lucide-react"

import { QueryErrorCard } from "@/components/query-error-card"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { mainAppQueries } from "@/lib/main-app-queries"
import { Button } from "@/components/ui/button"
import { GreetingCard } from "@/components/home/greeting-card"
import { StatsCards } from "@/components/home/stats-cards"
import { DeadlineWidget } from "@/components/home/deadline-widget"
import { RecentClasses } from "@/components/home/recent-classes"
import { ActivityGraphCard } from "@/components/home/activity-graph-card"
import { RecentActivityCard } from "@/components/home/recent-activity-card"
import { TeacherAnalyticsPanel } from "@/components/home/teacher-analytics-panel"
import { HomeActivitySkeleton, HomeOverviewSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export function HomePageClient() {
  const { isAuthenticated, isShellResolved, userId, userInfo, userRole } = useMainShellState()
  const overviewQuery = useQuery({
    ...mainAppQueries.homeOverview(userId ?? "guest"),
    enabled: Boolean(userId),
  })
  const activityQuery = useQuery({
    ...mainAppQueries.homeActivity(userId ?? "guest"),
    enabled: Boolean(userId),
  })

  const deadlines = useMemo(
    () =>
      overviewQuery.data?.deadlines.map((deadline) => ({
        ...deadline,
        dueDate: new Date(deadline.dueDate),
      })) ?? [],
    [overviewQuery.data],
  )

  if (!isShellResolved) {
    return (
      <section className="flex-1 space-y-6">
        <div className="overflow-hidden rounded-3xl border bg-card p-8 shadow-lg">
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-72 max-w-full" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
        </div>
        <HomeOverviewSkeleton />
        <HomeActivitySkeleton />
      </section>
    )
  }

  if (!isAuthenticated || !userId) {
    return (
      <section className="flex-1 space-y-6">
        <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/5 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-foreground">Welcome to UpClass</h3>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Discover classes, browse resources, and start your learning journey. Sign in to access all features.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/classes">Browse Classes</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex-1 space-y-6">
      <GreetingCard userName={userInfo?.name || "User"} role={userRole} />

      {overviewQuery.data ? (
        <>
          <StatsCards stats={overviewQuery.data.stats} role={userRole} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <DeadlineWidget deadlines={deadlines} role={userRole} />
            </div>
            <div className="lg:col-span-2">
              <RecentClasses classes={overviewQuery.data.classes} userRole={userRole} />
            </div>
          </div>

          {userRole === "teacher" && overviewQuery.data.teacherAnalytics ? (
            <TeacherAnalyticsPanel
              lowParticipation={overviewQuery.data.teacherAnalytics.lowParticipation}
              reviewQueue={overviewQuery.data.teacherAnalytics.reviewQueue}
              weeklySummary={overviewQuery.data.teacherAnalytics.weeklySummary}
            />
          ) : null}
        </>
      ) : overviewQuery.error ? (
        <QueryErrorCard
          title="Unable to load your home overview"
          description={overviewQuery.error.message}
          onRetry={() => {
            void overviewQuery.refetch()
          }}
        />
      ) : (
        <HomeOverviewSkeleton />
      )}

      {activityQuery.data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityGraphCard
              days={activityQuery.data.activityGraph.days}
              total={activityQuery.data.activityGraph.total}
            />
          </div>
          <div className="lg:col-span-1">
            <RecentActivityCard items={activityQuery.data.recentActivity} />
          </div>
        </div>
      ) : activityQuery.error ? (
        <QueryErrorCard
          title="Unable to load your recent activity"
          description={activityQuery.error.message}
          onRetry={() => {
            void activityQuery.refetch()
          }}
        />
      ) : (
        <HomeActivitySkeleton />
      )}
    </section>
  )
}
