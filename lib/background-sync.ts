"use client"

import { BackgroundCache } from "./background-cache"
import { getCacheBuffer } from "./cache-buffer"

// Background sync manager that caches all data types
export class BackgroundSync {
  private static instance: BackgroundSync
  private cache: BackgroundCache

  private constructor() {
    this.cache = BackgroundCache.getInstance()
  }

  static getInstance(): BackgroundSync {
    if (!BackgroundSync.instance) {
      BackgroundSync.instance = new BackgroundSync()
    }
    return BackgroundSync.instance
  }

  // Cache all data in background
  async cacheAllData() {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return
    }

    try {
      const buffer = getCacheBuffer()
      const allClasses = (buffer.classes ?? []) as Array<{ teacherImage?: string | null }>
      const resources = (buffer.resources ?? []) as Array<{ authorImage?: string | null }>
      const messages = buffer.messages ?? []
      const notifications = buffer.notifications ?? []

      const cachedImages = new Set<string>()

      allClasses.forEach((classItem) => {
        if (classItem.teacherImage) {
          cachedImages.add(classItem.teacherImage)
        }
      })

      resources.forEach((resource) => {
        if (resource.authorImage) {
          cachedImages.add(resource.authorImage)
        }
      })

      await Promise.all([
        this.cache.cacheClasses(allClasses),
        this.cache.cacheResources(resources),
        this.cache.cacheMessages(messages),
        this.cache.cacheNotifications(notifications),
        cachedImages.size > 0 ? this.cacheImages([...cachedImages]) : Promise.resolve(),
      ])

      await this.cache.clearOldCache()
    } catch (error) {
      console.error('Background cache failed:', error)
    }
  }

  // Prefetch and cache images - optimized with batching
  async cacheImages(urls: string[]) {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return
    }

    // Batch process images to avoid overwhelming the browser
    const batchSize = 5
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      
      await Promise.allSettled(
        batch.map(async (url) => {
          try {
            // Check if already cached
            const cached = await this.cache.getCachedImage(url)
            if (cached) return

            // Fetch and cache
            const response = await fetch(url, { cache: 'force-cache' })
            if (response.ok) {
              const blob = await response.blob()
              await this.cache.cacheImage(url, blob)
              
              // Also cache in service worker
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                  type: 'CACHE_IMAGE',
                  url
                })
              }
            }
          } catch (error) {
            // Silently fail for individual images
            console.debug(`Failed to cache image ${url}:`, error)
          }
        })
      )
      
      // Small delay between batches to avoid blocking
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  // Start periodic background caching - optimized
  startPeriodicCache(intervalMinutes: number = 30): (() => void) | void {
    if (typeof window === 'undefined') return

    // Cache immediately but debounced
    const initialTimeout = setTimeout(() => {
      if (navigator.onLine) {
        this.cacheAllData()
      }
    }, 5000) // Wait 5 seconds after page load

    // Then cache periodically
    const intervalId = setInterval(() => {
      if (navigator.onLine && !document.hidden) {
        this.cacheAllData()
      }
    }, intervalMinutes * 60 * 1000)

    // Cache when page becomes visible (debounced)
    let visibilityTimeout: NodeJS.Timeout | null = null
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine) {
        if (visibilityTimeout) clearTimeout(visibilityTimeout)
        visibilityTimeout = setTimeout(() => {
          this.cacheAllData()
        }, 2000) // Wait 2 seconds after becoming visible
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(intervalId)
      if (visibilityTimeout) clearTimeout(visibilityTimeout)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }
}
