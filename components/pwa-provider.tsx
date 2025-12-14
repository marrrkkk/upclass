"use client"

import { useEffect } from "react"
import { registerServiceWorker } from "@/lib/pwa-register"
import { OfflineIndicator } from "@/components/offline-indicator"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { BackgroundSync } from "@/lib/background-sync"
import { BackgroundCache } from "@/lib/background-cache"

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker()
    
    // Start background caching with cleanup
    const sync = BackgroundSync.getInstance()
    const cleanup = sync.startPeriodicCache(30) // Cache every 30 minutes
    
    // Clear old cache on startup (debounced)
    const cacheTimeout = setTimeout(() => {
      const cache = BackgroundCache.getInstance()
      cache.clearOldCache()
    }, 10000) // Wait 10 seconds after page load
    
    return () => {
      if (cleanup) cleanup()
      clearTimeout(cacheTimeout)
    }
  }, [])

  return (
    <>
      <OfflineIndicator />
      {children}
      <PWAInstallPrompt />
    </>
  )
}

