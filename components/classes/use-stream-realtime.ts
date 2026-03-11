"use client"

import { useEffect } from "react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import { supabase } from "@/lib/supabase-client"

export function useStreamRealtime(classId: string, router: AppRouterInstance) {
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
        () => {
          router.refresh()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcement_reactions",
        },
        () => {
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [classId, router])
}
