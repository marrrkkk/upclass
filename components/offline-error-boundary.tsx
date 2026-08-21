/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Component, ReactNode } from "react"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel } from "@/components/ui/panel"
import { BackgroundCache } from "@/lib/background-cache"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  isOffline: boolean
  hasCache: boolean
  checkingCache: boolean
}

export class OfflineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    // Always start with same values on server and client to avoid hydration mismatch
    this.state = {
      hasError: false,
      error: null,
      isOffline: false, // Will be updated in componentDidMount
      hasCache: false,
      checkingCache: true,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isOffline: typeof navigator !== 'undefined' && !navigator.onLine,
      hasCache: false,
      checkingCache: true,
    }
  }

  async checkCacheAvailability() {
    if (typeof window === 'undefined') return false
    
    try {
      const cache = BackgroundCache.getInstance()
      const db = await cache['ensureDB']()
      
      // Check if we have any cached data
      const stores = ['classes', 'resources', 'messages', 'notifications', 'conversations', 'classDetails']
      for (const storeName of stores) {
        if (db.objectStoreNames.contains(storeName)) {
          const tx = db.transaction(storeName, 'readonly')
          const store = tx.objectStore(storeName)
          const countRequest = store.count()
          
          const count = await new Promise<number>((resolve, reject) => {
            countRequest.onsuccess = () => resolve(countRequest.result)
            countRequest.onerror = () => reject(countRequest.error)
          })
          
          if (count > 0) {
            return true
          }
        }
      }
      
      // Also check service worker cache
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName)
          const keys = await cache.keys()
          if (keys.length > 0) {
            return true
          }
        }
      }
      
      return false
    } catch (error) {
      console.error('Error checking cache:', error)
      return false
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo)
    
    // Check if it's a network error
    const isNetworkError = error.message.includes('fetch') || 
                          error.message.includes('network') || 
                          error.message.includes('Failed to fetch') ||
                          error.message.includes('503') ||
                          error.message.includes('Service Unavailable') ||
                          (typeof navigator !== 'undefined' && !navigator.onLine)
    
    if (isNetworkError) {
      // Check if we have cached data before showing offline error
      this.checkCacheAvailability().then((hasCache) => {
        this.setState({ 
          isOffline: true,
          hasCache,
          checkingCache: false 
        })
      }).catch(() => {
        this.setState({ 
          isOffline: true,
          hasCache: false,
          checkingCache: false 
        })
      })
    } else {
      this.setState({ 
        isOffline: false,
        hasCache: false,
        checkingCache: false 
      })
    }
  }

  private handleOnline = () => {
    this.setState({ isOffline: false, hasError: false, error: null })
  }

  private handleOffline = () => {
    this.setState({ isOffline: true })
  }

  async componentDidMount() {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Set initial offline state
    const browserOffline = !navigator.onLine
    this.setState({ isOffline: browserOffline, checkingCache: browserOffline })
    
    // If offline, check if we have cache
    if (browserOffline) {
      const hasCache = await this.checkCacheAvailability()
      this.setState({ hasCache, checkingCache: false })
    }
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.checkingCache) {
      return this.props.children
    }

    // Extract orgSlug from current URL
    const orgSlug = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : ''
    const homePath = orgSlug ? `/${orgSlug}/dashboard` : '/dashboard'

    // Only block rendering for an actual error on an uncached cold start.
    if (this.state.hasError && !this.state.hasCache) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="mx-auto flex min-h-[60dvh] w-full max-w-2xl items-center p-4">
          <Panel padding="none" className="w-full">
            <EmptyState
              icon={<AlertTriangle aria-hidden="true" />}
              tone={this.state.isOffline ? "warning" : "danger"}
              size="page"
              title={this.state.isOffline ? "Route unavailable offline" : "Something went wrong"}
              description={this.state.isOffline
                ? "This route is not cached on this device yet. Reconnect once to make it available offline."
                : this.state.error?.message || "An unexpected error occurred."}
              role="alert"
              action={(
                <>
                  <Button onClick={this.handleRetry}>
                    <RefreshCw aria-hidden="true" />
                    Retry
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={homePath}>
                      <Home aria-hidden="true" />
                      Go to home
                    </Link>
                  </Button>
                </>
              )}
            />
          </Panel>
        </div>
      )
    }

    return this.props.children
  }
}
