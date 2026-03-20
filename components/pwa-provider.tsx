"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import { OfflineIndicator } from "@/components/offline-indicator"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { BackgroundCache } from "@/lib/background-cache"
import { BackgroundSync } from "@/lib/background-sync"
import { registerServiceWorker } from "@/lib/pwa-register"
import {
  detectPWAInstallPlatform,
  isStandaloneApp,
  markRouteWarm,
  probePwaCacheAvailability,
  setPWACacheReady,
  setPWAConnectionState,
  setPWAInstallPromptSurface,
  setPWAPathname,
  setPWAPendingActions,
  setPWASyncing,
  setPWAStandalone,
  setPWALastSyncAt,
} from "@/lib/pwa-state"
import { SyncManager } from "@/lib/sync-manager"

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isProduction = process.env.NODE_ENV === "production"

  useEffect(() => {
    registerServiceWorker()

    if (!isProduction) {
      return
    }

    setPWAStandalone(isStandaloneApp())

    const installPlatform = detectPWAInstallPlatform()
    if (installPlatform === "ios") {
      setPWAInstallPromptSurface("ios", true)
    }

    const syncManager = SyncManager.getInstance()
    const backgroundSync = BackgroundSync.getInstance()

    setPWAPendingActions(syncManager.getPendingActions().length)
    setPWAConnectionState(navigator.onLine)

    const cleanup = backgroundSync.startPeriodicCache(30)

    const cacheTimeout = window.setTimeout(() => {
      void BackgroundCache.getInstance().clearOldCache()
    }, 10000)

    const cacheProbeTimeout = window.setTimeout(() => {
      void probePwaCacheAvailability().then((hasCache) => {
        setPWACacheReady(hasCache)
      })
    }, 1500)

    const syncPendingActions = async () => {
      setPWASyncing(true)

      try {
        await syncManager.syncPendingActions()
        setPWAPendingActions(syncManager.getPendingActions().length)
        setPWALastSyncAt(Date.now())
      } catch (error) {
        console.error("Sync failed:", error)
      } finally {
        setPWASyncing(false)
      }
    }

    const handleConnectionChange = () => {
      const online = navigator.onLine
      setPWAConnectionState(online)
      setPWAPendingActions(syncManager.getPendingActions().length)

      if (online) {
        markRouteWarm(window.location.pathname)
        void syncPendingActions()
      }
    }

    const handleStorage = () => {
      setPWAPendingActions(syncManager.getPendingActions().length)
    }

    handleConnectionChange()

    window.addEventListener("online", handleConnectionChange)
    window.addEventListener("offline", handleConnectionChange)
    window.addEventListener("storage", handleStorage)

    return () => {
      if (cleanup) cleanup()
      window.clearTimeout(cacheTimeout)
      window.clearTimeout(cacheProbeTimeout)
      window.removeEventListener("online", handleConnectionChange)
      window.removeEventListener("offline", handleConnectionChange)
      window.removeEventListener("storage", handleStorage)
    }
  }, [isProduction])

  useEffect(() => {
    if (!isProduction) return

    const currentPath = pathname || "/"
    setPWAPathname(currentPath)

    if (navigator.onLine) {
      markRouteWarm(currentPath)
      setPWACacheReady(true)

      navigator.serviceWorker.controller?.postMessage({
        type: "CACHE_URLS",
        urls: [currentPath],
      })
    }
  }, [isProduction, pathname])

  return (
    <>
      <OfflineIndicator />
      {children}
      <PWAInstallPrompt />
    </>
  )
}
