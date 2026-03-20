"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { BackgroundCache } from "@/lib/background-cache"
import { useClassDetailCache } from "@/hooks/classes/use-class-detail-cache"
import { usePageHeaderStore } from "@/stores/page-header-store"
import type {
  AnnouncementData,
  ClassData,
  ClassworkData,
  MemberData,
  QuizData,
  SubmissionData,
} from "@/types/classes"

type ClassDetailTab = "stream" | "classwork" | "quizzes" | "people"

type ClassDetailContentClientProps = {
  activeTab: ClassDetailTab
  classData: ClassData
  userId?: string
  userRole: "teacher" | "student" | null
  announcements: AnnouncementData[]
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  quizzes: QuizData[]
  members: MemberData[]
}

const StreamTab = dynamic(() => import("@/components/classes/stream-tab").then((mod) => mod.StreamTab))
const ClassworkTab = dynamic(() => import("@/components/classes/classwork-tab").then((mod) => mod.ClassworkTab))
const QuizTab = dynamic(() => import("@/components/classes/quiz-tab").then((mod) => mod.QuizTab))
const PeopleTab = dynamic(() => import("@/components/classes/people-tab").then((mod) => mod.PeopleTab))

export function ClassDetailContentClient({
  activeTab,
  classData,
  userId,
  userRole,
  announcements,
  classwork,
  submissions,
  quizzes,
  members,
}: ClassDetailContentClientProps) {
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const [cachedDetail, setCachedDetail] = useState<{
    classData: ClassData
    announcements: AnnouncementData[]
    classwork: ClassworkData[]
    submissions: SubmissionData[]
    quizzes: QuizData[]
    members: MemberData[]
    userId?: string
    userRole: "teacher" | "student" | null
  } | null>(null)

  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined" || navigator.onLine) return

    let cancelled = false

    const hydrate = async () => {
      try {
        const cache = BackgroundCache.getInstance()
        const cached = await cache.getCachedClassDetail(classData.id)
        if (!cancelled && cached) {
          setCachedDetail(cached)
        }
      } catch (error) {
        console.debug("Failed to hydrate cached class detail:", error)
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [classData.id])

  const effectiveClassData = cachedDetail?.classData ?? classData
  const effectiveAnnouncements = cachedDetail?.announcements ?? announcements
  const effectiveClasswork = cachedDetail?.classwork ?? classwork
  const effectiveSubmissions = cachedDetail?.submissions ?? submissions
  const effectiveQuizzes = cachedDetail?.quizzes ?? quizzes
  const effectiveMembers = cachedDetail?.members ?? members
  const effectiveUserId = cachedDetail?.userId ?? userId
  const effectiveUserRole = cachedDetail?.userRole ?? userRole
  const classColor = effectiveClassData.color || "#3b82f6"

  useEffect(() => {
    setPageTitle(effectiveClassData.title)
    return () => setPageTitle(null)
  }, [effectiveClassData.title, setPageTitle])

  useEffect(() => {
    document.title = `${effectiveClassData.title} | UpClass`
  }, [effectiveClassData.title])

  useClassDetailCache({
    classData: effectiveClassData,
    announcements: effectiveAnnouncements,
    classwork: effectiveClasswork,
    submissions: effectiveSubmissions,
    quizzes: effectiveQuizzes,
    members: effectiveMembers,
    pathname,
    userId: effectiveUserId,
    userRole: effectiveUserRole,
  })

  return (
    <div className="px-1">
      {activeTab === "stream" ? (
        <StreamTab
          classId={effectiveClassData.id}
          userId={effectiveUserId}
          userRole={effectiveUserRole}
          announcements={effectiveAnnouncements}
          classColor={classColor}
        />
      ) : null}
      {activeTab === "classwork" ? (
        <ClassworkTab
          classId={effectiveClassData.id}
          userId={effectiveUserId}
          userRole={effectiveUserRole}
          classwork={effectiveClasswork}
          submissions={effectiveSubmissions}
          classColor={classColor}
        />
      ) : null}
      {activeTab === "quizzes" ? (
        <QuizTab
          classId={effectiveClassData.id}
          userId={effectiveUserId}
          userRole={effectiveUserRole}
          quizzes={effectiveQuizzes}
          classColor={classColor}
        />
      ) : null}
      {activeTab === "people" ? (
        <PeopleTab
          classId={effectiveClassData.id}
          userId={effectiveUserId}
          userRole={effectiveUserRole}
          members={effectiveMembers}
        />
      ) : null}
    </div>
  )
}
