"use client"

import dynamic from "next/dynamic"

import { OfflineErrorBoundary } from "@/components/offline-error-boundary"

const PWAProvider = dynamic(() => import("@/components/pwa-provider").then((mod) => mod.PWAProvider), {
  ssr: false,
})

export function RootClientShell({ children }: { children: React.ReactNode }) {
  return (
    <PWAProvider>
      <OfflineErrorBoundary>{children}</OfflineErrorBoundary>
    </PWAProvider>
  )
}
