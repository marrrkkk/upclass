"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff, Cloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { SyncManager } from "@/lib/sync-manager"

export function OfflineIndicator() {
  // Always start with same values on server and client to avoid hydration mismatch
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showIndicator, setShowIndicator] = useState(false)

  // Check if server is actually reachable
  const checkServerStatus = async () => {
    try {
      // Try to fetch a lightweight endpoint with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      try {
        const response = await fetch(window.location.origin, { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        return response.ok
      } catch (fetchError) {
        clearTimeout(timeoutId)
        return false
      }
    } catch (error) {
      return false
    }
  }

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    let statusInterval: NodeJS.Timeout | null = null
    
    // Set initial online status - check immediately
    const initialCheck = async () => {
      const browserOnline = navigator.onLine
      if (!browserOnline) {
        setIsOnline(false)
        setShowIndicator(true)
        return
      }
      
      // Check server status immediately, then again after a short delay
      const checkNow = async () => {
        const serverReachable = await checkServerStatus()
        const actuallyOnline = browserOnline && serverReachable
        
        setIsOnline(actuallyOnline)
        setShowIndicator(!actuallyOnline)
      }
      
      // Check immediately
      checkNow()
      
      // Also check after a short delay to catch server going down
      setTimeout(checkNow, 1000)
    }
    
    initialCheck()
    
    // Check periodically when browser says online (to catch server being down)
    statusInterval = setInterval(async () => {
      if (navigator.onLine) {
        const serverReachable = await checkServerStatus()
        setIsOnline((prev) => {
          if (!serverReachable && prev) {
            setShowIndicator(true)
            return false
          } else if (serverReachable && !prev) {
            setShowIndicator(true)
            return true
          }
          return prev
        })
      }
    }, 5000) // Check every 5 seconds

    // Listen for online/offline events
    const handleOnline = async () => {
      // Verify server is actually reachable
      const serverReachable = await checkServerStatus()
      if (!serverReachable) {
        setIsOnline(false)
        setShowIndicator(true)
        return
      }
      
      setIsOnline(true)
      setIsSyncing(true)
      setShowIndicator(true)
      
      // Trigger sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          return (registration as any).sync.register('sync-data').catch(() => {
            // Sync registration might fail, that's okay
          })
        })
      }

      // Sync pending actions
      try {
        const syncManager = SyncManager.getInstance()
        await syncManager.syncPendingActions()
      } catch (error) {
        console.error('Sync failed:', error)
      }

      // Hide indicator after sync completes
      setTimeout(() => {
        setIsSyncing(false)
        setTimeout(() => {
          setShowIndicator(false)
        }, 2000)
      }, 1500)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsSyncing(false)
      setShowIndicator(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Also listen for visibility changes to check connection
    const handleVisibilityChange = async () => {
      if (!document.hidden && typeof window !== 'undefined') {
        const browserOnline = navigator.onLine
        const serverReachable = browserOnline ? await checkServerStatus() : false
        const actuallyOnline = browserOnline && serverReachable
        
        setIsOnline(actuallyOnline)
        setShowIndicator(!actuallyOnline)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (statusInterval) clearInterval(statusInterval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] transition-all duration-300",
        showIndicator ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
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
            <span className="text-sm font-medium">You're offline. Using cached data. Changes will sync when connection is restored.</span>
          </>
        )}
      </div>
    </div>
  )
}

