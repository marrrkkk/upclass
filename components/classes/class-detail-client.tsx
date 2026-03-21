import { ClassDetailHero } from "@/components/classes/class-detail-hero"
import { ClassDetailTabs } from "@/components/classes/class-detail-tabs"
import { ClassDetailContentClient } from "@/components/classes/class-detail-content-client"
import { getVisibleClassTab } from "@/lib/classes/class-detail-tabs"
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
  activeTab: "stream" | "classwork" | "quizzes" | "people"
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
  activeTab,
  userId,
  userRole,
  announcements,
  classwork,
  submissions,
  quizzes,
  members,
}: ClassDetailClientProps) {
  const visibleTab = getVisibleClassTab(activeTab, "stream")
  const classColor = classData.color || "#3b82f6"

  return (
    <div className="flex flex-col gap-6 -mt-4">
      <ClassDetailHero classData={classData} classColor={classColor} userRole={userRole} />
      <ClassDetailTabs activeTab={visibleTab} classColor={classColor} classId={classData.id} />
      <ClassDetailContentClient
        activeTab={visibleTab}
        classData={classData}
        userId={userId}
        userRole={userRole}
        announcements={announcements}
        classwork={classwork}
        submissions={submissions}
        quizzes={quizzes}
        members={members}
      />
    </div>
  )
}
