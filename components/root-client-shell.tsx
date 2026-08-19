"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import dynamic from "next/dynamic"

import { OfflineErrorBoundary } from "@/components/offline-error-boundary"
import { ToastProvider } from "@/components/ui/toast"
import { getQueryClient } from "@/lib/query-client"

const PWAProvider = dynamic(() => import("@/components/pwa-provider").then((mod) => mod.PWAProvider), {
  ssr: false,
})

export function RootClientShell({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PWAProvider>
          <OfflineErrorBoundary>{children}</OfflineErrorBoundary>
        </PWAProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
