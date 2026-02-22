"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff, Cloud, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SyncManager } from "@/lib/sync-manager"

// Helper to share server connectivity status with other parts of the app
const setGlobalServerOnline = (online: boolean) => {
  if (typeof window === "undefined") return
  ;(window as any).__UPCLASS_SERVER_ONLINE__ = online
}

export function OfflineIndicator() {
  // Always start with same values on server and client to avoid hydration mismatch
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showIndicator, setShowIndicator] = useState(false)
  const [dismissedOffline, setDismissedOffline] = useState(false)

  // Check if server is reachable (used only for sync after coming back online).
  // We do NOT use this to show "offline" - only navigator.onLine is used for that,
  // to avoid false "offline" when the server is slow or a request times out.
  const checkServerStatus = async (): Promise<boolean> => {
    if (!navigator.onLine) return false
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      try {
        const response = await fetch(window.location.origin, {
          method: "HEAD",
          cache: "no-cache",
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return response.ok || response.status < 500
      } catch {
        clearTimeout(timeoutId)
        return false
      }
    } catch {
      return navigator.onLine
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    // Derive offline state only from navigator.onLine so we never show
    // "You're offline" when the user actually has connectivity.
    const updateFromNavigator = () => {
      const online = navigator.onLine
      setIsOnline(online)
      setGlobalServerOnline(online)
      if (!online) {
        setShowIndicator(true)
        setIsSyncing(false)
      }
    }

    // Initial state from browser
    updateFromNavigator()

    const handleOffline = () => {
      setIsOnline(false)
      setIsSyncing(false)
      setShowIndicator(true)
      setGlobalServerOnline(false)
    }

    const handleOnline = async () => {
      setIsOnline(true)
      setGlobalServerOnline(true)
      setIsSyncing(true)
      setShowIndicator(true)

      if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          ;(registration as any).sync.register("sync-data").catch(() => {})
        })
      }

      try {
        const serverReachable = await checkServerStatus()
        if (serverReachable) {
          const syncManager = SyncManager.getInstance()
          await syncManager.syncPendingActions()
        }
      } catch (error) {
        console.error("Sync failed:", error)
      }

      setTimeout(() => {
        setIsSyncing(false)
        setTimeout(() => setShowIndicator(false), 2000)
      }, 1500)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] transition-all duration-300",
        showIndicator && (!dismissedOffline || isOnline)
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-full pointer-events-none"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-2.5 shadow-lg backdrop-blur-sm border-b",
          isOnline
            ? isSyncing
              ? "bg-blue-500/95 text-white border-blue-400"
              : "bg-green-500/95 text-white border-green-400"
            : "bg-orange-500/95 text-white border-orange-400"
        )}
      >
        {isOnline ? (
          isSyncing ? (
            <>
              <Cloud className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Syncing data...</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Back online</span>
            </>
          )
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              You're offline. Using cached data. Changes will sync when connection is restored.
            </span>
          </>
        )}

        {/* Close button (only meaningful for offline state; returns after full page refresh) */}
        {!isOnline && (
          <button
            type="button"
            onClick={() => setDismissedOffline(true)}
            className="ml-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/40 text-white/90 hover:bg-white/15 hover:text-white transition-colors"
            aria-label="Dismiss offline status message"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

