"use client"

import { usePathname } from "next/navigation"

import { useBackgroundRefresh } from "@/hooks/use-background-refresh"

export function BackgroundRefreshClient() {
  const pathname = usePathname()
  const refreshInterval = pathname?.includes("/whiteboard") ? 0 : 30000

  useBackgroundRefresh(pathname || "/", refreshInterval)

  return null
}

