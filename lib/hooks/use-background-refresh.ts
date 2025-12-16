/**
 * Hook to refresh page data in the background while keeping cached version visible
 */

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export function useBackgroundRefresh(path: string, interval: number = 30000) {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Refresh in background every interval, but only when we believe we're actually online.
    // This respects both the browser's offline flag and the app-level server reachability flag
    // that is maintained by the OfflineIndicator component.
    intervalRef.current = setInterval(() => {
      const browserOnline = typeof navigator !== "undefined" ? navigator.onLine : true
      const serverOnline =
        typeof window !== "undefined" && (window as any).__UPCLASS_SERVER_ONLINE__ === false
          ? false
          : true

      if (browserOnline && serverOnline) {
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
