"use client"

import { useQuery } from "@tanstack/react-query"

import { AuthRequiredCard } from "@/components/auth-required-card"
import { NotificationsClient } from "@/components/notifications/notifications-client"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { QueryErrorCard } from "@/components/query-error-card"
import { mainAppQueries } from "@/lib/main-app-queries"

export function NotificationsRouteClient() {
  const { isAuthenticated, isShellResolved, userId } = useMainShellState()
  const notificationsQuery = useQuery({
    ...mainAppQueries.notifications(userId ?? "guest"),
    enabled: Boolean(isAuthenticated && userId),
  })

  if (!isShellResolved) {
    return (
      <section className="flex flex-col gap-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Stay updated with your latest class activities.</p>
        </div>
        <NotificationsClient notifications={[]} userId="" showHeader={false} isLoading />
      </section>
    )
  }

  if (!isAuthenticated || !userId) {
    return (
      <AuthRequiredCard
        title="Sign in to view notifications"
        description="Your notification feed is only available after you sign in."
      />
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-1 text-muted-foreground">Stay updated with your latest class activities.</p>
      </div>

      {notificationsQuery.error && !notificationsQuery.data ? (
        <QueryErrorCard
          title="Unable to load notifications"
          description={notificationsQuery.error.message}
          onRetry={() => {
            void notificationsQuery.refetch()
          }}
        />
      ) : (
        <NotificationsClient
          notifications={notificationsQuery.data?.notifications ?? []}
          userId={userId}
          showHeader={false}
          isLoading={!notificationsQuery.data && notificationsQuery.isPending}
        />
      )}
    </section>
  )
}
