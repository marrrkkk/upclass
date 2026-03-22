"use client"

import { useEffect } from "react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase-client"
import type { ClassworkData } from "@/types/classes"

type UseClassworkRealtimeParams = {
  classId: string
  classwork: ClassworkData[]
  router: AppRouterInstance
  userId?: string
  userRole: "teacher" | "student" | null
  onClassworkPayload?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => boolean
  onSubmissionPayload?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => boolean
}

export function useClassworkRealtime({
  classId,
  classwork,
  router,
  userId,
  userRole,
  onClassworkPayload,
  onSubmissionPayload,
}: UseClassworkRealtimeParams) {
  useEffect(() => {
    if (!supabase) return

    const classworkChannel = supabase
      .channel(`classwork:${classId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classwork",
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const handled = onClassworkPayload?.(payload)
          if (handled) return
          router.refresh()
        },
      )
      .subscribe()

    const classworkIds = new Set(classwork.map((item) => item.id))

    const submissionsChannel = supabase
      .channel(`submissions:${classId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          ...(userRole === "student" ? { filter: `student_id=eq.${userId}` } : {}),
        },
        (payload) => {
          const handled = onSubmissionPayload?.(payload)
          if (handled) return

          if (userRole === "teacher") {
            const newRecord = payload.new as { classwork_id?: string } | null
            const oldRecord = payload.old as { classwork_id?: string } | null
            const submissionClassworkId = newRecord?.classwork_id || oldRecord?.classwork_id

            if (submissionClassworkId && classworkIds.has(submissionClassworkId)) {
              router.refresh()
            }
            return
          }

          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(classworkChannel)
      supabase?.removeChannel(submissionsChannel)
    }
  }, [classId, classwork, onClassworkPayload, onSubmissionPayload, router, userId, userRole])
}
