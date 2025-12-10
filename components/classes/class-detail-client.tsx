"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Settings, PenTool } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { StreamTab } from "@/components/classes/stream-tab"
import { ClassworkTab } from "@/components/classes/classwork-tab"
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
  userId: string
  userRole: "teacher" | "student"
  announcements: AnnouncementData[]
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  members: MemberData[]
}

export function ClassDetailClient({
  classData,
  userId,
  userRole,
  announcements,
  classwork,
  submissions,
  members,
}: ClassDetailClientProps) {
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const [activeTab, setActiveTab] = useState<"stream" | "classwork" | "people">("stream")
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
    <div className="flex flex-col gap-6">
      {/* Cover with class color */}
      <div
        className="h-32 w-full rounded-lg"
        style={{ backgroundColor: classColor }}
      />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{classData.title}</h1>
            {classData.description && (
              <p className="text-muted-foreground">{classData.description}</p>
            )}
          </div>
          {userRole === "teacher" && (
            <div className="flex items-center gap-2">
              <a
                href={`/home/classes/${classData.id}/whiteboard`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "gap-2"
                )}
                style={{ borderColor: `${classColor}40` }}
              >
                <PenTool className="h-4 w-4" />
                Whiteboard
              </a>
              <ClassSettingsDialog classData={classData} />
              <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Class Code</p>
                  <p className="font-mono text-lg font-semibold">{classData.code}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-8 w-8",
                  )}
                  type="button"
                  title="Copy class code"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {classData.category && (
            <span
              className="inline-block rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: `${classColor}40`,
                backgroundColor: `${classColor}15`,
                color: classColor,
              }}
            >
              {classData.category}
            </span>
          )}
          <a
            href={`/home/classes/${classData.id}/whiteboard`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "gap-2"
            )}
            style={{ borderColor: `${classColor}40` }}
          >
            <PenTool className="h-4 w-4" />
            Whiteboard
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border bg-card p-1 text-sm shadow-sm">
        <button
          className={cn(
            "rounded-md px-4 py-2 font-medium transition-colors",
            activeTab === "stream"
              ? "text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
          style={activeTab === "stream" ? { backgroundColor: classColor } : {}}
          onClick={() => setActiveTab("stream")}
        >
          Stream
        </button>
        <button
          className={cn(
            "rounded-md px-4 py-2 font-medium transition-colors",
            activeTab === "classwork"
              ? "text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
          style={activeTab === "classwork" ? { backgroundColor: classColor } : {}}
          onClick={() => setActiveTab("classwork")}
        >
          Classwork
        </button>
        <button
          className={cn(
            "rounded-md px-4 py-2 font-medium transition-colors",
            activeTab === "people"
              ? "text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
          style={activeTab === "people" ? { backgroundColor: classColor } : {}}
          onClick={() => setActiveTab("people")}
        >
          People
        </button>
      </div>

      {/* Tab Content */}
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
      {activeTab === "people" && <PeopleTab members={members} />}
    </div>
  )
}

