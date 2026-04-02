"use client"

import { useEffect } from "react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase-client"

type AnnouncementRecord = {
  id?: string
  content?: string
}

type ReactionRecord = {
  announcement_id?: string
  user_id?: string
  reaction?: string
}

type UseStreamRealtimeParams = {
  classId: string
  onUnhandledChange?: () => void
  router?: AppRouterInstance
  onAnnouncementPayload?: (payload: RealtimePostgresChangesPayload<AnnouncementRecord>) => boolean
  onReactionPayload?: (payload: RealtimePostgresChangesPayload<ReactionRecord>) => boolean
}

export function useStreamRealtime({
  classId,
  onUnhandledChange,
  router,
  onAnnouncementPayload,
  onReactionPayload,
}: UseStreamRealtimeParams) {
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`announcements:${classId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const handled = onAnnouncementPayload?.(payload)
          if (handled) return
          if (onUnhandledChange) {
            onUnhandledChange()
            return
          }
          router?.refresh()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcement_reactions",
        },
        (payload) => {
          const handled = onReactionPayload?.(payload)
          if (handled) return
          if (onUnhandledChange) {
            onUnhandledChange()
            return
          }
          router?.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [classId, onAnnouncementPayload, onReactionPayload, onUnhandledChange, router])
}
