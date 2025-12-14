/**
 * Hook to refresh page data in the background while keeping cached version visible
 */

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export function useBackgroundRefresh(path: string, interval: number = 30000) {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Don't refresh if offline
    if (!navigator.onLine) {
      return
    }

    // Refresh in background every interval
    intervalRef.current = setInterval(() => {
      // Only refresh if online
      if (navigator.onLine) {
        // Use router.refresh() to refresh server components without full page reload
        router.refresh()
      }
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [path, interval, router])

  return {
    refresh: () => router.refresh(),
  }
}
