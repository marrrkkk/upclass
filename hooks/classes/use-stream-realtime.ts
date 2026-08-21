"use client"

import { useEffect } from "react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase-client"
import { scheduleRouterRefresh } from "@/lib/coalesced-router-refresh"

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
  router: AppRouterInstance
  onAnnouncementPayload?: (payload: RealtimePostgresChangesPayload<AnnouncementRecord>) => boolean
  onReactionPayload?: (payload: RealtimePostgresChangesPayload<ReactionRecord>) => boolean
}

export function useStreamRealtime({
  classId,
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
          scheduleRouterRefresh(`announcements:${classId}`, router)
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
          scheduleRouterRefresh(`reactions:${classId}`, router)
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [classId, onAnnouncementPayload, onReactionPayload, router])
}
