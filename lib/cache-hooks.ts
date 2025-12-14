"use client"

import { useEffect } from "react"
import { BackgroundCache } from "@/lib/background-cache"

// Hook to cache data when it's fetched - debounced for performance
export function useCacheData<T>(
  data: T[] | undefined,
  type: 'classes' | 'resources' | 'messages' | 'notifications',
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !data || data.length === 0) return
    if (!navigator.onLine) return // Don't cache when offline

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

// Hook to cache images
export function useCacheImage(url: string | null | undefined, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !url) return

    const cache = BackgroundCache.getInstance()
    
    // Fetch and cache image in background
    const cacheImage = async () => {
      try {
        // Check if already cached
        const cached = await cache.getCachedImage(url)
        if (cached) return

        // Fetch and cache
        const response = await fetch(url)
        if (response.ok) {
          const blob = await response.blob()
          await cache.cacheImage(url, blob)
        }
      } catch (error) {
        console.error('Failed to cache image:', error)
      }
    }

    cacheImage()
  }, [url, enabled])
}

