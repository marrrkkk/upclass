"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { BackgroundCache } from "@/lib/background-cache"
import { useClassDetailCache } from "@/hooks/classes/use-class-detail-cache"
import { usePageHeaderStore } from "@/stores/page-header-store"
import type {
  AnnouncementData,
  ClassData,
  ClassRailData,
  ClassworkData,
  MemberData,
  QuizData,
  SubmissionData,
} from "@/types/classes"
import {
  ClassworkTabSkeleton,
  GradebookTabSkeleton,
  PeopleTabSkeleton,
  QuizTabSkeleton,
  StreamTabSkeleton,
} from "@/components/skeletons"
import { Callout } from "@/components/ui/callout"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/typography"

type ClassDetailTab = "stream" | "classwork" | "quizzes" | "gradebook" | "people"

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
  railData: ClassRailData
  showSetupChecklist?: boolean
  showStudentWelcome?: boolean
}

const StreamTab = dynamic(() => import("@/components/classes/stream-tab").then((mod) => mod.StreamTab), {
  loading: () => <StreamTabSkeleton />,
})
const ClassworkTab = dynamic(() => import("@/components/classes/classwork-tab").then((mod) => mod.ClassworkTab), {
  loading: () => <ClassworkTabSkeleton />,
})
const QuizTab = dynamic(() => import("@/components/classes/quiz-tab").then((mod) => mod.QuizTab), {
  loading: () => <QuizTabSkeleton />,
})
const GradebookTab = dynamic(() => import("@/components/classes/gradebook-tab").then((mod) => mod.GradebookTab), {
  loading: () => <GradebookTabSkeleton />,
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
  quizzes,
  members,
  railData,
  showSetupChecklist = false,
  showStudentWelcome = false,
}: ClassDetailContentClientProps) {
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [cachedDetail, setCachedDetail] = useState<{
    classData: ClassData
    announcements: AnnouncementData[]
    classwork: ClassworkData[]
    submissions: SubmissionData[]
    quizzes: QuizData[]
    members: MemberData[]
    rail?: ClassRailData
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
  const effectiveQuizzes = cachedDetail?.quizzes ?? quizzes
  const effectiveMembers = cachedDetail?.members ?? members
  const effectiveRailData = cachedDetail?.rail ?? railData
  const effectiveUserId = cachedDetail?.userId ?? userId
  const effectiveUserRole = cachedDetail?.userRole ?? userRole
  const classColor = effectiveClassData.color || "#0e6b52"

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
    rail: effectiveRailData,
    userId: effectiveUserId,
    userRole: effectiveUserRole,
  })

  return (
    <div className="space-y-4">
      {showStudentWelcome && effectiveUserRole === "student" && !welcomeDismissed ? (
        <Callout tone="info" className="relative pr-12">
          <div className="space-y-1">
            <Text variant="h4">Welcome to {effectiveClassData.title}</Text>
            <Text variant="small" tone="muted">
              Check Classwork for assignments and Stream for announcements from your teacher.
            </Text>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => setWelcomeDismissed(true)}
          >
            Dismiss
          </Button>
        </Callout>
      ) : null}

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
      {activeTab === "gradebook" ? (
        <GradebookTab
          classId={effectiveClassData.id}
          members={effectiveMembers}
          classwork={effectiveClasswork}
          submissions={effectiveSubmissions}
          quizzes={effectiveQuizzes}
        />
      ) : null}
      {activeTab === "people" ? (
        <PeopleTab
          classId={effectiveClassData.id}
          classCode={effectiveClassData.code}
          userId={effectiveUserId}
          userRole={effectiveUserRole}
          members={effectiveMembers}
          showSetupChecklist={showSetupChecklist}
        />
      ) : null}
    </div>
  )
}