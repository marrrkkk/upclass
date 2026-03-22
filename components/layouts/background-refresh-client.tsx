"use client"

import { usePathname } from "next/navigation"

import { useBackgroundRefresh } from "@/hooks/use-background-refresh"

export function BackgroundRefreshClient() {
  const pathname = usePathname()
  const refreshInterval = 0

  useBackgroundRefresh(pathname || "/", refreshInterval)

  return null
}
