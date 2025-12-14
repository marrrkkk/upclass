/**
 * Hook for prefetching pages on hover and keeping them cached
 */

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export function usePrefetch() {
  const router = useRouter()
  const prefetchedRef = useRef<Set<string>>(new Set())
  const hoverTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetch = (href: string) => {
    if (prefetchedRef.current.has(href)) return
    
    // Prefetch the route
    router.prefetch(href)
    prefetchedRef.current.add(href)
  }

  const prefetchOnHover = (href: string, delay: number = 100) => {
    // Clear any existing timeout
    const existingTimeout = hoverTimeoutRef.current.get(href)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      prefetch(href)
      hoverTimeoutRef.current.delete(href)
    }, delay)

    hoverTimeoutRef.current.set(href, timeout)
  }

  const cancelPrefetch = (href: string) => {
    const timeout = hoverTimeoutRef.current.get(href)
    if (timeout) {
      clearTimeout(timeout)
      hoverTimeoutRef.current.delete(href)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hoverTimeoutRef.current.forEach((timeout) => clearTimeout(timeout))
      hoverTimeoutRef.current.clear()
    }
  }, [])

  return {
    prefetch,
    prefetchOnHover,
    cancelPrefetch,
  }
}
