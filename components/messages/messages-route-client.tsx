"use client"

import { useQuery } from "@tanstack/react-query"

import { AuthRequiredCard } from "@/components/auth-required-card"
import { MessagesClient } from "@/components/messages/messages-client"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { QueryErrorCard } from "@/components/query-error-card"
import { mainAppQueries } from "@/lib/main-app-queries"

export function MessagesRouteClient() {
  const { isAuthenticated, isShellResolved, userId } = useMainShellState()
  const messagesQuery = useQuery({
    ...mainAppQueries.messages(userId ?? "guest"),
    enabled: Boolean(isAuthenticated && userId),
  })

  if (!isShellResolved) {
    return (
      <section className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="mt-1 text-muted-foreground">Connect with your classmates and teachers.</p>
        </div>
        <MessagesClient threads={[]} channels={[]} userId="" showHeader={false} isLoading />
      </section>
    )
  }

  if (!isAuthenticated || !userId) {
    return (
      <AuthRequiredCard
        title="Sign in to view messages"
        description="Your conversations and class channels are only available after you sign in."
      />
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="mt-1 text-muted-foreground">Connect with your classmates and teachers.</p>
      </div>

      {messagesQuery.error && !messagesQuery.data ? (
        <QueryErrorCard
          title="Unable to load messages"
          description={messagesQuery.error.message}
          onRetry={() => {
            void messagesQuery.refetch()
          }}
        />
      ) : (
        <MessagesClient
          threads={messagesQuery.data?.threads ?? []}
          channels={messagesQuery.data?.channels ?? []}
          userId={userId}
          showHeader={false}
          isLoading={!messagesQuery.data && messagesQuery.isPending}
        />
      )}
    </section>
  )
}
