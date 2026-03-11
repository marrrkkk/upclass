"use client"

import { useState, useEffect } from "react"

import { ClassDetailHero } from "@/components/classes/class-detail-hero"
import { ClassDetailTabs, getVisibleClassTab } from "@/components/classes/class-detail-tabs"
import { StreamTab } from "@/components/classes/stream-tab"
import { ClassworkTab } from "@/components/classes/classwork-tab"
import { QuizTab } from "@/components/classes/quiz-tab"
import { PeopleTab } from "@/components/classes/people-tab"
import { useClassDetailCache } from "@/components/classes/use-class-detail-cache"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"
import { usePathname, useSearchParams } from "next/navigation"
import type {
  AnnouncementData,
  ClassData,
  ClassworkData,
  MemberData,
  QuizData,
  SubmissionData,
} from "@/components/classes/types"

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

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const visibleTab = getVisibleClassTab(searchParams.get("tab"), activeTab)

  // Set page title for breadcrumbs
  useEffect(() => {
    setPageTitle(classData.title)
    return () => setPageTitle(null)
  }, [classData.title, setPageTitle])

  useClassDetailCache({
    classData,
    announcements,
    classwork,
    submissions,
    quizzes,
    members,
    pathname,
    userId,
    userRole,
  })

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(classData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const classColor = classData.color || "#3b82f6"

  return (
    <div className="flex flex-col gap-6 -mt-4">
      <ClassDetailHero
        classData={classData}
        classColor={classColor}
        copied={copied}
        userRole={userRole}
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
            classId={classData.id}
            userId={userId}
            userRole={userRole}
            announcements={announcements}
            classColor={classColor}
          />
        )}
        {visibleTab === "classwork" && (
          <ClassworkTab
            classId={classData.id}
            userId={userId}
            userRole={userRole}
            classwork={classwork}
            submissions={submissions}
            classColor={classColor}
          />
        )}
        {visibleTab === "quizzes" && (
          <QuizTab
            classId={classData.id}
            userId={userId}
            userRole={userRole}
            quizzes={quizzes}
            classColor={classColor}
          />
        )}
        {visibleTab === "people" && <PeopleTab classId={classData.id} userId={userId} userRole={userRole} members={members} />}
      </div>
    </div>
  )
}
