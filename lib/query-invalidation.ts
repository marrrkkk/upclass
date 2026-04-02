import type { QueryClient } from "@tanstack/react-query"

import type { NotificationsPageResponse } from "@/lib/main-app-queries"
import { mainQueryKeys } from "@/lib/query-keys"

export async function invalidateClassCollections(queryClient: QueryClient, userId?: string) {
  if (!userId) return

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.classes(userId) }),
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.homeOverview(userId) }),
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.homeActivity(userId) }),
    queryClient.invalidateQueries({ queryKey: ["activity", userId] }),
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.shellRecentClasses(userId) }),
  ])
}

export async function invalidateResourceCollections(queryClient: QueryClient, userId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.resources(userId ?? "guest") }),
    ...(userId
      ? [
          queryClient.invalidateQueries({ queryKey: mainQueryKeys.homeActivity(userId) }),
          queryClient.invalidateQueries({ queryKey: ["activity", userId] }),
        ]
      : []),
  ])
}

export async function invalidateNotificationsCollections(queryClient: QueryClient, userId: string) {
  await queryClient.invalidateQueries({ queryKey: mainQueryKeys.notifications(userId) })
}

export async function invalidateMessagesCollections(queryClient: QueryClient, userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.messages(userId) }),
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.homeOverview(userId) }),
  ])
}

export async function invalidateActivityCollections(queryClient: QueryClient, userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.homeActivity(userId) }),
    queryClient.invalidateQueries({ queryKey: ["activity", userId] }),
  ])
}

export async function invalidateClassDetailCollections(
  queryClient: QueryClient,
  options: {
    classId: string
    userId?: string
  },
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: mainQueryKeys.classFrame(options.classId) }),
    queryClient.invalidateQueries({ queryKey: ["class", options.classId, "tab"] }),
    invalidateClassCollections(queryClient, options.userId),
  ])
}

export function patchNotificationsQuery(
  queryClient: QueryClient,
  userId: string,
  updater: (current: NotificationsPageResponse["notifications"]) => NotificationsPageResponse["notifications"],
) {
  queryClient.setQueryData<NotificationsPageResponse>(
    mainQueryKeys.notifications(userId),
    (current) =>
      current
        ? {
            ...current,
            notifications: updater(current.notifications),
          }
        : current,
  )
}
