"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Settings, PenTool } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { StreamTab } from "@/components/classes/stream-tab"
import { ClassworkTab } from "@/components/classes/classwork-tab"
import { QuizTab } from "@/components/classes/quiz-tab"
import { PeopleTab } from "@/components/classes/people-tab"
import { ClassSettingsDialog } from "@/components/classes/class-settings-dialog"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"

type ClassData = {
  id: string
  title: string
  description: string | null
  category: string | null
  code: string
  color: string
  schedule: string | null
}

type AnnouncementData = {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    image: string | null
  }
}

type ClassworkData = {
  id: string
  title: string
  description: string | null
  type: string
  dueDate: string | null
  points: string | null
  createdAt: string
}

type QuizOption = {
  id: string
  questionId: string
  text: string
  isCorrect: boolean
}

type QuizQuestion = {
  id: string
  quizId: string
  prompt: string
  type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
  points: string
  order: string
  options: QuizOption[]
}

type QuizAttempt = {
  id: string
  quizId: string
  studentId: string
  score: string | null
  submittedAt: string | null
  timeSpentSeconds: string | null
}

type QuizAnswer = {
  id: string
  attemptId: string
  questionId: string
  selectedOptionIds: string | null
  textAnswer: string | null
  isCorrect: boolean | null
  pointsAwarded: string | null
}

type QuizData = {
  id: string
  classId: string
  title: string
  description: string | null
  status: "draft" | "published"
  dueDate: string | null
  timeLimitSeconds: string | null
  totalPoints: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  questions: QuizQuestion[]
  attempt: QuizAttempt | null
  answers: QuizAnswer[]
}

type SubmissionData = {
  id: string
  classworkId: string
  studentId: string
  content: string | null
  fileUrl: string | null
  fileName: string | null
  status: string
  grade: string | null
  feedback: string | null
  submittedAt: string | null
  gradedAt: string | null
  student: {
    id: string
    name: string
    image: string | null
  }
}

type MemberData = {
  id: string
  name: string
  email: string
  image: string | null
  role: "teacher" | "student"
}

type ClassDetailClientProps = {
  classData: ClassData
  userId?: string
  userRole: "teacher" | "student" | null
  announcements: AnnouncementData[]
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  quizzes: QuizData[]
  members: MemberData[]
  isAuthenticated?: boolean
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
  isAuthenticated = false,
}: ClassDetailClientProps) {
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const [activeTab, setActiveTab] = useState<"stream" | "classwork" | "quizzes" | "people">("stream")
  const [copied, setCopied] = useState(false)

  // Set page title for breadcrumbs
  useEffect(() => {
    setPageTitle(classData.title)
    return () => setPageTitle(null)
  }, [classData.title, setPageTitle])

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(classData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const classColor = classData.color || "#3b82f6"

  return (
    <div className="flex flex-col gap-6 -mt-4">
      {/* Hero Banner */}
      <div
        className="relative w-full rounded-b-xl overflow-hidden shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${classColor} 0%, ${classColor}dd 100%)`,
          height: "240px"
        }}
      >
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

        {/* Content Container */}
        <div className="absolute bottom-0 left-0 w-full p-8 text-white">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                {classData.category && (
                  <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm border border-white/20">
                    {classData.category}
                  </span>
                )}
                {classData.schedule && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                    {classData.schedule}
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                {classData.title}
              </h1>
              {classData.description && (
                <p className="text-blue-50/90 text-lg max-w-xl line-clamp-2">
                  {classData.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-3">
              {userRole === "teacher" && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 p-2 backdrop-blur-md border border-white/20">
                    <div className="px-2">
                      <p className="text-[10px] font-medium text-blue-100 uppercase tracking-wider">Class Code</p>
                      <p className="font-mono text-xl font-bold">{classData.code}</p>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/20 transition-colors"
                      type="button"
                      title="Copy class code"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <ClassSettingsDialog classData={classData} trigger={
                    <button className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 backdrop-blur-md border border-white/20 transition-colors">
                      <Settings className="h-5 w-5" />
                    </button>
                  } />
                </div>
              )}

              <a
                href={`/home/classes/${classData.id}/whiteboard`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-600 px-4 py-2 font-semibold shadow-sm hover:bg-blue-50 transition-colors"
              >
                <PenTool className="h-4 w-4" />
                Open Whiteboard
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b w-full">
        <div className="flex items-center gap-8 px-4">
          <button
            className={cn(
              "relative py-4 text-sm font-medium transition-colors hover:text-foreground",
              activeTab === "stream"
                ? "text-primary"
                : "text-muted-foreground"
            )}
            onClick={() => setActiveTab("stream")}
          >
            Stream
            {activeTab === "stream" && (
              <span
                className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-full"
                style={{ backgroundColor: classColor }}
              />
            )}
          </button>
          <button
            className={cn(
              "relative py-4 text-sm font-medium transition-colors hover:text-foreground",
              activeTab === "classwork"
                ? "text-primary"
                : "text-muted-foreground"
            )}
            onClick={() => setActiveTab("classwork")}
          >
            Classwork
            {activeTab === "classwork" && (
              <span
                className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-full"
                style={{ backgroundColor: classColor }}
              />
            )}
          </button>
          <button
            className={cn(
              "relative py-4 text-sm font-medium transition-colors hover:text-foreground",
              activeTab === "quizzes"
                ? "text-primary"
                : "text-muted-foreground"
            )}
            onClick={() => setActiveTab("quizzes")}
          >
            Quizzes
            {activeTab === "quizzes" && (
              <span
                className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-full"
                style={{ backgroundColor: classColor }}
              />
            )}
          </button>
          <button
            className={cn(
              "relative py-4 text-sm font-medium transition-colors hover:text-foreground",
              activeTab === "people"
                ? "text-primary"
                : "text-muted-foreground"
            )}
            onClick={() => setActiveTab("people")}
          >
            People
            {activeTab === "people" && (
              <span
                className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-full"
                style={{ backgroundColor: classColor }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-1">
        {activeTab === "stream" && (
          <StreamTab
            classId={classData.id}
            userRole={userRole}
            announcements={announcements}
            classColor={classColor}
          />
        )}
        {activeTab === "classwork" && (
          <ClassworkTab
            classId={classData.id}
            userId={userId}
            userRole={userRole}
            classwork={classwork}
            submissions={submissions}
            classColor={classColor}
          />
        )}
        {activeTab === "quizzes" && (
          <QuizTab
            classId={classData.id}
            userId={userId}
            userRole={userRole}
            quizzes={quizzes}
            classColor={classColor}
          />
        )}
        {activeTab === "people" && <PeopleTab members={members} />}
      </div>
    </div>
  )
}

