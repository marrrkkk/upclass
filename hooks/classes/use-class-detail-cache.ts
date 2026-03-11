"use client"

import { useEffect } from "react"

import { BackgroundCache } from "@/lib/background-cache"

import type {
  AnnouncementData,
  ClassData,
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
  pathname: string | null
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
  pathname,
  userId,
  userRole,
}: UseClassDetailCacheArgs) {
  useEffect(() => {
    if (!navigator.onLine) return

    const cacheClassDetail = async () => {
      try {
        const cache = BackgroundCache.getInstance()

        await cache.cacheClassDetail(classData.id, {
          classData,
          announcements,
          classwork,
          submissions,
          quizzes,
          members,
          userId,
          userRole,
        })

        if (!pathname) return

        try {
          const response = await fetch(pathname)
          if (!response.ok) return

          const html = await response.text()
          await cache.cachePage(pathname, html)
        } catch (error) {
          console.debug("Failed to cache class detail page HTML:", error)
        }
      } catch (error) {
        console.error("Failed to cache class detail:", error)
      }
    }

    const timeout = setTimeout(cacheClassDetail, 2000)
    return () => clearTimeout(timeout)
  }, [announcements, classData, classwork, members, pathname, quizzes, submissions, userId, userRole])
}
