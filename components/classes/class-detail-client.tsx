"use client"

import { useState, useEffect } from "react"

import { ClassDetailHero } from "@/components/classes/class-detail-hero"
import { ClassDetailTabs, getVisibleClassTab } from "@/components/classes/class-detail-tabs"
import { StreamTab } from "@/components/classes/stream-tab"
import { ClassworkTab } from "@/components/classes/classwork-tab"
import { QuizTab } from "@/components/classes/quiz-tab"
import { PeopleTab } from "@/components/classes/people-tab"
import { useClassDetailCache } from "@/hooks/classes/use-class-detail-cache"
import { usePageHeaderStore } from "@/stores/page-header-store"
import { usePathname, useSearchParams } from "next/navigation"
import { BackgroundCache } from "@/lib/background-cache"
import type {
  AnnouncementData,
  ClassData,
  ClassworkData,
  MemberData,
  QuizData,
  SubmissionData,
} from "@/types/classes"

type ClassDetailClientProps = {
  classData: ClassData
  userId?: string
  userRole: "teacher" | "student" | null
  announcements: AnnouncementData[]
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  quizzes: QuizData[]
  members: MemberData[]
}

export function ClassDetailClient({
  classData,
  userId,
  userRole,
  announcements,
  classwork,
  submissions,
  quizzes,
  members,
}: ClassDetailClientProps) {
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const [activeTab, setActiveTab] = useState<"stream" | "classwork" | "quizzes" | "people">("stream")
  const [copied, setCopied] = useState(false)
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
  const searchParams = useSearchParams()
  const visibleTab = getVisibleClassTab(searchParams.get("tab"), activeTab)

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

  // Set page title for breadcrumbs
  useEffect(() => {
    setPageTitle(effectiveClassData.title)
    return () => setPageTitle(null)
  }, [effectiveClassData.title, setPageTitle])

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

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(effectiveClassData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const classColor = effectiveClassData.color || "#3b82f6"

  return (
    <div className="flex flex-col gap-6 -mt-4">
      <ClassDetailHero
        classData={effectiveClassData}
        classColor={classColor}
        copied={copied}
        userRole={effectiveUserRole}
        onCopyCode={handleCopyCode}
      />
      <ClassDetailTabs
        activeTab={visibleTab}
        classColor={classColor}
        onTabChange={setActiveTab}
      />
      <div className="px-1">
        {visibleTab === "stream" && (
          <StreamTab
            classId={effectiveClassData.id}
            userId={effectiveUserId}
            userRole={effectiveUserRole}
            announcements={effectiveAnnouncements}
            classColor={classColor}
          />
        )}
        {visibleTab === "classwork" && (
          <ClassworkTab
            classId={effectiveClassData.id}
            userId={effectiveUserId}
            userRole={effectiveUserRole}
            classwork={effectiveClasswork}
            submissions={effectiveSubmissions}
            classColor={classColor}
          />
        )}
        {visibleTab === "quizzes" && (
          <QuizTab
            classId={effectiveClassData.id}
            userId={effectiveUserId}
            userRole={effectiveUserRole}
            quizzes={effectiveQuizzes}
            classColor={classColor}
          />
        )}
        {visibleTab === "people" && <PeopleTab classId={effectiveClassData.id} userId={effectiveUserId} userRole={effectiveUserRole} members={effectiveMembers} />}
      </div>
    </div>
  )
}
