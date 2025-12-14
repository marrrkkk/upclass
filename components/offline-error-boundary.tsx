"use client"

import { Component, ReactNode } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  isOffline: boolean
}

export class OfflineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    // Always start with same values on server and client to avoid hydration mismatch
    this.state = {
      hasError: false,
      error: null,
      isOffline: false, // Will be updated in componentDidMount
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isOffline: !navigator.onLine,
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo)
    
    // Check if it's a network error
    if (error.message.includes('fetch') || error.message.includes('network') || !navigator.onLine) {
      this.setState({ isOffline: true })
    }
  }

  private handleOnline = () => {
    this.setState({ isOffline: false, hasError: false, error: null })
  }

  private handleOffline = () => {
    this.setState({ isOffline: true })
  }

  componentDidMount() {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Set initial offline state
    this.setState({ isOffline: !navigator.onLine })
    
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
    if (this.state.hasError || this.state.isOffline) {
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
                  ? "This page is not available in cache. Please check your internet connection."
                  : this.state.error?.message || "An unexpected error occurred."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/home">
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

