/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Component, ReactNode } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
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

    // Only block rendering for an actual error on an uncached cold start.
    if (this.state.hasError && !this.state.hasCache) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-orange-500" />
              </div>
              <CardTitle className="text-center">
                {this.state.isOffline ? "You're Offline" : "Something Went Wrong"}
              </CardTitle>
              <CardDescription className="text-center">
                {this.state.isOffline
                  ? "This route is not cached on this device yet. Reconnect once to make it available offline."
                  : this.state.error?.message || "An unexpected error occurred."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
