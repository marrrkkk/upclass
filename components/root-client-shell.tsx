"use client"

import dynamic from "next/dynamic"

import { OfflineErrorBoundary } from "@/components/offline-error-boundary"
import { QueryProvider } from "@/components/providers/query-provider"

const PWAProvider = dynamic(() => import("@/components/pwa-provider").then((mod) => mod.PWAProvider), {
  ssr: false,
})

export function RootClientShell({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <PWAProvider>
        <OfflineErrorBoundary>{children}</OfflineErrorBoundary>
      </PWAProvider>
    </QueryProvider>
  )
}
