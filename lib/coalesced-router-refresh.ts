"use client"

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

/**
 * Trailing-edge debounce for `router.refresh()`.
 *
 * Every refresh wipes the client router cache for all visited routes, so a
 * burst of realtime events (e.g. several reactions to one announcement) would
 * otherwise invalidate every cached page and force a refetch on the next
 * navigation. Coalescing per channel keeps the cache alive during event
 * storms while still landing a final refresh shortly after the last event.
 */
const COALESCE_WINDOW_MS = 1000

const timers = new Map<string, number>()

export function scheduleRouterRefresh(key: string, router: AppRouterInstance) {
  const existing = timers.get(key)
  if (existing !== undefined) {
    window.clearTimeout(existing)
  }
  const timer = window.setTimeout(() => {
    timers.delete(key)
    router.refresh()
  }, COALESCE_WINDOW_MS)
  timers.set(key, timer)
}