/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useState } from "react"
import { BackgroundCache } from "@/lib/background-cache"
import { setCacheBuffer, type CacheBufferType } from "@/lib/cache-buffer"

// Hook to cache data when it's fetched - debounced for performance
export function useCacheData<T>(
  data: T[] | undefined,
  type: CacheBufferType,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !data || data.length === 0) return
    if (!navigator.onLine) return // Don't cache when offline

    // Keep the background sync buffer fresh so periodic cache writes work
    // without reaching into React state.
    setCacheBuffer(type, data as unknown[])

    // Use a ref to store timeout per hook instance
    let cacheTimeout: NodeJS.Timeout | null = null

    // Debounce caching to avoid too frequent writes
    cacheTimeout = setTimeout(async () => {
      const cache = BackgroundCache.getInstance()
      
      try {
        console.log(`Caching ${data.length} ${type} items...`)
        switch (type) {
          case 'classes':
            await cache.cacheClasses(data as any[])
            break
          case 'resources':
            await cache.cacheResources(data as any[])
            break
          case 'messages':
            await cache.cacheMessages(data as any[])
            break
          case 'notifications':
            await cache.cacheNotifications(data as any[])
            break
        }
        console.log(`Successfully cached ${type}`)
      } catch (error) {
        console.error(`Failed to cache ${type}:`, error)
      }
    }, 2000) // Debounce by 2 seconds

    return () => {
      if (cacheTimeout) {
        clearTimeout(cacheTimeout)
      }
    }
  }, [data, type, enabled])
}

type UseOfflineCollectionCacheOptions<T> = {
  enabled?: boolean
  onlineData: T[]
  getCachedData: () => Promise<T[]>
  onHydrate: (data: T[]) => void
  transform?: (data: T[]) => T[]
}

export function useOfflineCollectionCache<T>({
  enabled = true,
  onlineData,
  getCachedData,
  onHydrate,
  transform,
}: UseOfflineCollectionCacheOptions<T>) {
  const hydratedRef = useRef(false)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncConnectionState = () => {
      setIsOffline(!navigator.onLine)
    }

    syncConnectionState()
    window.addEventListener("online", syncConnectionState)
    window.addEventListener("offline", syncConnectionState)

    return () => {
      window.removeEventListener("online", syncConnectionState)
      window.removeEventListener("offline", syncConnectionState)
    }
  }, [])

  useEffect(() => {
    if (!isOffline) {
      hydratedRef.current = false
    }
  }, [isOffline])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    if (!isOffline && onlineData.length > 0) {
      return
    }
    if (isOffline && hydratedRef.current) {
      return
    }

    let cancelled = false

    const hydrateFromCache = async () => {
      try {
        const cachedData = await getCachedData()
        if (!cancelled && cachedData.length > 0) {
          onHydrate(transform ? transform(cachedData) : cachedData)
        }
        if (!cancelled && isOffline) {
          hydratedRef.current = true
        }
      } catch (error) {
        console.error("Failed to hydrate data from cache:", error)
      }
    }

    void hydrateFromCache()

    return () => {
      cancelled = true
    }
  }, [enabled, getCachedData, isOffline, onHydrate, onlineData, transform])
}
