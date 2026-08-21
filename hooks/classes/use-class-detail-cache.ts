"use client"

import { useEffect } from "react"

import { BackgroundCache } from "@/lib/background-cache"
import { BackgroundSync } from "@/lib/background-sync"

import type {
  AnnouncementData,
  ClassData,
  ClassRailData,
  ClassworkData,
  MemberData,
  QuizData,
  SubmissionData,
} from "@/types/classes"

type UseClassDetailCacheArgs = {
  classData: ClassData
  announcements: AnnouncementData[]
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  quizzes: QuizData[]
  members: MemberData[]
  rail?: ClassRailData
  userId?: string
  userRole: "teacher" | "student" | null
}

export function useClassDetailCache({
  classData,
  announcements,
  classwork,
  submissions,
  quizzes,
  members,
  rail,
  userId,
  userRole,
}: UseClassDetailCacheArgs) {
  useEffect(() => {
    if (!navigator.onLine) return

    const cacheClassDetail = async () => {
      try {
        const cache = BackgroundCache.getInstance()
        const sync = BackgroundSync.getInstance()

        await cache.cacheClassDetail(classData.id, {
          classData,
          announcements,
          classwork,
          submissions,
          quizzes,
          members,
          rail,
          userId,
          userRole,
        })

        await sync.cacheAllData()
      } catch (error) {
        console.error("Failed to cache class detail:", error)
      }
    }

    const timeout = setTimeout(cacheClassDetail, 2000)
    return () => clearTimeout(timeout)
  }, [announcements, classData, classwork, members, quizzes, rail, submissions, userId, userRole])
}
