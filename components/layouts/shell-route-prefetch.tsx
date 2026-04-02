"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { mainAppQueries } from "@/lib/main-app-queries"

type ShellRoutePrefetchProps = {
  isAuthenticated: boolean
  userId?: string
  recentClasses?: Array<{
    id: string
  }>
}

const AUTHENTICATED_ROUTES = [
  "/home",
  "/activity",
  "/classes",
  "/resources",
  "/messages",
  "/notifications",
]

export function ShellRoutePrefetch({
  isAuthenticated,
  recentClasses,
  userId,
}: ShellRoutePrefetchProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    const runWhenIdle = (callback: () => void | Promise<void>) => {
      const browserWindow = window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
        cancelIdleCallback?: (handle: number) => void
      }

      if (typeof browserWindow.requestIdleCallback === "function") {
        const idleId = browserWindow.requestIdleCallback(() => {
          void callback()
        }, { timeout: 1200 })

        return () => browserWindow.cancelIdleCallback?.(idleId)
      }

      const timeoutId = globalThis.setTimeout(() => {
        void callback()
      }, 250)

      return () => globalThis.clearTimeout(timeoutId)
    }

    const cleanup = runWhenIdle(async () => {
      const routesToPrefetch = isAuthenticated
        ? AUTHENTICATED_ROUTES
        : ["/home", "/classes", "/resources"]

      routesToPrefetch.forEach((href) => {
        router.prefetch(href)
      })

      if (!isAuthenticated || !userId) {
        return
      }

      await Promise.all([
        queryClient.prefetchQuery(mainAppQueries.homeOverview(userId)),
        queryClient.prefetchQuery(mainAppQueries.homeActivity(userId)),
        queryClient.prefetchQuery(mainAppQueries.classes(userId)),
        queryClient.prefetchQuery(mainAppQueries.resources(userId)),
        queryClient.prefetchQuery(mainAppQueries.notifications(userId)),
        queryClient.prefetchQuery(mainAppQueries.messages(userId)),
        queryClient.prefetchQuery(mainAppQueries.activity(userId, "all", null)),
        queryClient.prefetchQuery(mainAppQueries.recentClasses(userId)),
      ])

      const prefetchedRecentClasses =
        queryClient.getQueryData<ReadonlyArray<{ id: string }>>(mainAppQueries.recentClasses(userId).queryKey) ??
        recentClasses ??
        []

      prefetchedRecentClasses.forEach((classItem) => {
        const href = `/classes/${classItem.id}`
        router.prefetch(href)
        void queryClient.prefetchQuery(mainAppQueries.classFrame(classItem.id))
        void queryClient.prefetchQuery(mainAppQueries.classTab(classItem.id, "stream"))
      })
    })

    return cleanup
  }, [isAuthenticated, queryClient, recentClasses, router, userId])

  return null
}
