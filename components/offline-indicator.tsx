"use client"

import { useState } from "react"
import { Cloud, RefreshCw, Wifi, WifiOff, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { StatusBadge } from "@/components/ui/status-badge"
import type { Tone } from "@/lib/design-system"
import { applyPendingAppUpdate } from "@/lib/pwa-register"
import {
  getPWAIndicatorState,
  setPWAOfflineBannerDismissed,
  usePWAState,
} from "@/lib/pwa-state"
import { cn } from "@/lib/utils"

const indicatorTones = {
  offline: "warning",
  syncing: "info",
  update: "primary",
  online: "success",
} satisfies Record<string, Tone>

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

  const tone = indicatorTones[indicator.tone]
  const isOffline = indicator.tone === "offline"
  const isUpdate = indicator.tone === "update"
  const isSyncing = indicator.tone === "syncing"

  const actions = isUpdate || (isOffline && !state.offlineBannerDismissed) ? (
    <div className="flex shrink-0 items-center gap-2">
      {isUpdate ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            setRefreshing(true)
            try {
              await applyPendingAppUpdate()
            } finally {
              setRefreshing(false)
            }
          }}
          disabled={refreshing}
        >
          <RefreshCw className={cn(refreshing && "animate-spin")} aria-hidden="true" />
          Refresh
        </Button>
      ) : null}

      {isOffline && !state.offlineBannerDismissed ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => setPWAOfflineBannerDismissed(true)}
          aria-label="Dismiss offline status"
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  ) : undefined

  return (
    <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] w-[min(24rem,calc(100vw-1.5rem))]">
      <Callout
        tone={tone}
        icon={<Icon aria-hidden="true" />}
        action={actions}
        className="w-full border shadow-e2 sm:items-center"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="type-small font-semibold">{indicator.title}</p>
            <StatusBadge tone={tone}>{indicator.routeLabel}</StatusBadge>
            {indicator.routeWarm ? (
              <StatusBadge tone="neutral">Cached</StatusBadge>
            ) : null}
            {isSyncing && state.pendingActions > 0 ? (
              <StatusBadge tone="neutral">{state.pendingActions} queued</StatusBadge>
            ) : null}
          </div>
          <p className="type-small">{indicator.description}</p>
        </div>
      </Callout>
    </div>
  )
}
