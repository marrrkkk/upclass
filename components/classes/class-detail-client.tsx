"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { StreamTab } from "@/components/classes/stream-tab"
import { ClassworkTab } from "@/components/classes/classwork-tab"
import { PeopleTab } from "@/components/classes/people-tab"

type ClassData = {
  id: string
  title: string
  description: string | null
  category: string | null
  code: string
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
  const [activeTab, setActiveTab] = useState<"stream" | "classwork" | "people">("stream")
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(classData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
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
          )}
        </div>
        {classData.category && (
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {classData.category}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border bg-card p-1 text-sm shadow-sm">
        <button
          className={cn(
            "rounded-md px-4 py-2 font-medium transition-colors",
            activeTab === "stream"
              ? "bg-blue-600 text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("stream")}
        >
          Stream
        </button>
        <button
          className={cn(
            "rounded-md px-4 py-2 font-medium transition-colors",
            activeTab === "classwork"
              ? "bg-blue-600 text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("classwork")}
        >
          Classwork
        </button>
        <button
          className={cn(
            "rounded-md px-4 py-2 font-medium transition-colors",
            activeTab === "people"
              ? "bg-blue-600 text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
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
        />
      )}
      {activeTab === "classwork" && (
        <ClassworkTab
          classId={classData.id}
          userId={userId}
          userRole={userRole}
          classwork={classwork}
          submissions={submissions}
        />
      )}
      {activeTab === "people" && <PeopleTab members={members} />}
    </div>
  )
}

