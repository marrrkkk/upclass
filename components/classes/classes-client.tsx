"use client"

import { useState } from "react"
import { GraduationCap, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

type ClassCardData = {
  id: string
  title: string
  description: string | null
  category: string | null
  createdAt: string
  enrolledCount: number
  role: "teaching" | "enrolled"
}

type ClassesClientProps = {
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
}

export function ClassesClient({
  teachingClasses,
  enrolledClasses,
}: ClassesClientProps) {
  const [activeTab, setActiveTab] = useState<"teaching" | "enrolled">("teaching")

  const list = activeTab === "teaching" ? teachingClasses : enrolledClasses

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border bg-card p-1 text-sm shadow-sm">
          <button
            className={cn(
              "rounded-md px-4 py-2 font-medium transition-colors",
              activeTab === "teaching"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("teaching")}
          >
            Teaching
          </button>
          <button
            className={cn(
              "rounded-md px-4 py-2 font-medium transition-colors",
              activeTab === "enrolled"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("enrolled")}
          >
            Enrolled
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-blue-50 text-blue-600">
              <GraduationCap className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
              {activeTab === "teaching"
                ? "No Classes Yet"
                : "No Enrolled Classes"}
            </EmptyTitle>
            <EmptyDescription>
              {activeTab === "teaching"
                ? "You haven't created any classes yet. Get started by creating your first class."
                : "You haven't enrolled in any classes yet. Browse available classes to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((item) => <ClassCard key={item.id} data={item} />)}
        </div>
      )}
    </div>
  )
}

function ClassCard({ data }: { data: ClassCardData }) {
  const createdDate = data.createdAt
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
      }).format(new Date(data.createdAt))
    : ""

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-400">
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
          {data.enrolledCount} enrolled
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{data.title}</h3>
          {data.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {data.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {data.category ? (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
              {data.category}
            </span>
          ) : null}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
            {data.role === "teaching" ? "Teaching" : "Enrolled"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span>{data.enrolledCount} member{data.enrolledCount === 1 ? "" : "s"}</span>
          </div>
          <span>Updated {createdDate}</span>
        </div>
      </div>
    </div>
  )
}

