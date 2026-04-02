"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { BackgroundCache } from "@/lib/background-cache"
import { recordRecentClassVisit } from "@/lib/recent-class-visits"
import { useClassDetailCache } from "@/hooks/classes/use-class-detail-cache"
import { usePageHeaderStore } from "@/stores/page-header-store"
import type {
  AnnouncementData,
  ClassData,
  ClassResourceData,
  ClassworkData,
  MemberData,
  QuizData,
  SubmissionData,
} from "@/types/classes"
import {
  ClassworkTabSkeleton,
  PeopleTabSkeleton,
  QuizTabSkeleton,
  ResourcesTabSkeleton,
  StreamTabSkeleton,
} from "@/components/skeletons"

type ClassDetailTab = "stream" | "classwork" | "resources" | "quizzes" | "people"

type ClassDetailContentClientProps = {
  activeTab: ClassDetailTab
  classData: ClassData
  userId?: string
  userRole: "teacher" | "student" | null
  announcements: AnnouncementData[]
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  resources: ClassResourceData[]
  quizzes: QuizData[]
  members: MemberData[]
}

const StreamTab = dynamic(() => import("@/components/classes/stream-tab").then((mod) => mod.StreamTab), {
  loading: () => <StreamTabSkeleton />,
})
const ClassworkTab = dynamic(() => import("@/components/classes/classwork-tab").then((mod) => mod.ClassworkTab), {
  loading: () => <ClassworkTabSkeleton />,
})
const ResourcesTab = dynamic(
  () => import("@/components/classes/resources-tab").then((mod) => mod.ResourcesTab),
  {
    loading: () => <ResourcesTabSkeleton />,
  },
)
const QuizTab = dynamic(() => import("@/components/classes/quiz-tab").then((mod) => mod.QuizTab), {
  loading: () => <QuizTabSkeleton />,
})
const PeopleTab = dynamic(() => import("@/components/classes/people-tab").then((mod) => mod.PeopleTab), {
  loading: () => <PeopleTabSkeleton />,
})

export function ClassDetailContentClient({
  activeTab,
  classData,
  userId,
  userRole,
  announcements,
  classwork,
  submissions,
  resources,
  quizzes,
  members,
}: ClassDetailContentClientProps) {
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const [cachedDetail, setCachedDetail] = useState<{
    classData: ClassData
    announcements: AnnouncementData[]
    classwork: ClassworkData[]
    submissions: SubmissionData[]
    resources: ClassResourceData[]
    quizzes: QuizData[]
    members: MemberData[]
    userId?: string
    userRole: "teacher" | "student" | null
  } | null>(null)

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
  const effectiveResources = cachedDetail?.resources ?? resources
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

  useEffect(() => {
    recordRecentClassVisit(effectiveClassData.id)
  }, [effectiveClassData.id])

  useClassDetailCache({
    classData: effectiveClassData,
    announcements: effectiveAnnouncements,
    classwork: effectiveClasswork,
    submissions: effectiveSubmissions,
    resources: effectiveResources,
    quizzes: effectiveQuizzes,
    members: effectiveMembers,
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
      {activeTab === "resources" ? (
        <ResourcesTab
          classId={effectiveClassData.id}
          userId={effectiveUserId}
          userRole={effectiveUserRole}
          resources={effectiveResources}
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
