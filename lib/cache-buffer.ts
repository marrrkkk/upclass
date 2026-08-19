"use client"

/**
 * Non-React buffer holding the latest server-provided collections that have
 * been written through to the IndexedDB background cache.
 *
 * BackgroundSync.cacheAllData used to read directly from the Zustand stores;
 * now that server data no longer lives in Zustand, `useCacheData` records the
 * data it caches here so the periodic background sync can keep the IndexedDB
 * cache warm without reaching into React state.
 */
export type CacheBufferType = "classes" | "resources" | "messages" | "notifications"

const buffer: Partial<Record<CacheBufferType, unknown[]>> = {}

export function setCacheBuffer(type: CacheBufferType, data: unknown[]) {
  buffer[type] = data
}

export function getCacheBuffer() {
  return buffer
}