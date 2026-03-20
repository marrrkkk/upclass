"use client"

import { useState } from "react"
import { Cloud, RefreshCw, Wifi, WifiOff, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { applyPendingAppUpdate } from "@/lib/pwa-register"
import {
  getPWAIndicatorState,
  setPWAOfflineBannerDismissed,
  usePWAState,
} from "@/lib/pwa-state"
import { cn } from "@/lib/utils"

const toneStyles = {
  offline:
    "bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(29,78,216,0.9))] text-white border-sky-400/40",
  syncing:
    "bg-[linear-gradient(135deg,rgba(7,89,133,0.98),rgba(14,116,144,0.92))] text-white border-cyan-300/40",
  update:
    "bg-[linear-gradient(135deg,rgba(88,28,135,0.96),rgba(79,70,229,0.92))] text-white border-violet-300/40",
  online:
    "bg-[linear-gradient(135deg,rgba(8,47,73,0.96),rgba(15,118,110,0.88))] text-white border-emerald-300/40",
} as const

export function OfflineIndicator() {
  const state = usePWAState((current) => current)
  const indicator = getPWAIndicatorState(state)
  const [refreshing, setRefreshing] = useState(false)

  if (!indicator.visible) {
    return null
  }

  const Icon = indicator.tone === "offline"
    ? WifiOff
    : indicator.tone === "update"
      ? RefreshCw
      : indicator.tone === "syncing"
        ? Cloud
        : Wifi

  const isOffline = indicator.tone === "offline"
  const isUpdate = indicator.tone === "update"
  const isSyncing = indicator.tone === "syncing"

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] px-3 pt-[env(safe-area-inset-top)]">
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl items-center gap-3 rounded-b-3xl border-b px-4 py-3 shadow-2xl backdrop-blur-xl",
          toneStyles[indicator.tone],
        )}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold leading-none">{indicator.title}</p>
            <Badge variant="secondary" className="border-white/15 bg-white/10 text-white">
              {indicator.routeLabel}
            </Badge>
            {indicator.routeWarm && (
              <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
                Cached
              </Badge>
            )}
            {isSyncing && state.pendingActions > 0 && (
              <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
                {state.pendingActions} queued
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-white/80">{indicator.description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isUpdate && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                setRefreshing(true)
                try {
                  await applyPendingAppUpdate()
                } finally {
                  setRefreshing(false)
                }
              }}
              className="rounded-full bg-white text-slate-950 hover:bg-white/90"
              disabled={refreshing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          )}

          {isOffline && !state.offlineBannerDismissed && (
            <button
              type="button"
              onClick={() => setPWAOfflineBannerDismissed(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss offline status"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
