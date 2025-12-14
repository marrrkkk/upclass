/**
 * Client-side page cache for instant navigation
 * Uses Zustand to cache page data and router cache for instant page loads
 */

import { create } from "zustand"

type CachedPageData = {
  data: any
  timestamp: number
  path: string
}

type PageCacheState = {
  cache: Map<string, CachedPageData>
  setPageData: (path: string, data: any) => void
  getPageData: (path: string) => any | null
  clearPageData: (path: string) => void
  clearAll: () => void
  isStale: (path: string, maxAge?: number) => boolean
}

// Default cache max age: 5 minutes
const DEFAULT_MAX_AGE = 5 * 60 * 1000

export const usePageCache = create<PageCacheState>((set, get) => ({
  cache: new Map<string, CachedPageData>(),
  
  setPageData: (path: string, data: any) => {
    set((state) => {
      const newCache = new Map(state.cache)
      newCache.set(path, {
        data,
        timestamp: Date.now(),
        path,
      })
      return { cache: newCache }
    })
  },
  
  getPageData: (path: string) => {
    const state = get()
    const cached = state.cache.get(path)
    if (!cached) return null
    
    // Check if stale
    if (state.isStale(path)) {
      state.clearPageData(path)
      return null
    }
    
    return cached.data
  },
  
  clearPageData: (path: string) => {
    set((state) => {
      const newCache = new Map(state.cache)
      newCache.delete(path)
      return { cache: newCache }
    })
  },
  
  clearAll: () => {
    set({ cache: new Map() })
  },
  
  isStale: (path: string, maxAge: number = DEFAULT_MAX_AGE) => {
    const state = get()
    const cached = state.cache.get(path)
    if (!cached) return true
    
    return Date.now() - cached.timestamp > maxAge
  },
}))
