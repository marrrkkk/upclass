"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { GraduationCap, Clock, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  color: string | null
  schedule: string | null
  createdAt: string
  enrolledCount: number
  role: "teaching" | "enrolled"
  teacherName: string | null
  teacherImage: string | null
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
  const [searchQuery, setSearchQuery] = useState("")

  const list = activeTab === "teaching" ? teachingClasses : enrolledClasses

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list

    const query = searchQuery.toLowerCase()
    return list.filter((classItem) => {
      const titleMatch = classItem.title.toLowerCase().includes(query)
      const descriptionMatch = classItem.description?.toLowerCase().includes(query)
      const categoryMatch = classItem.category?.toLowerCase().includes(query)
      const teacherMatch = classItem.teacherName?.toLowerCase().includes(query)
      const scheduleMatch = classItem.schedule?.toLowerCase().includes(query)

      return titleMatch || descriptionMatch || categoryMatch || teacherMatch || scheduleMatch
    })
  }, [list, searchQuery])

  return (
    <div className="flex flex-col gap-6">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-10 pr-4 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1 text-sm shadow-sm w-fit">
        <button
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200",
            activeTab === "teaching"
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("teaching")}
        >
          Teaching
        </button>
        <button
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200",
            activeTab === "enrolled"
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("enrolled")}
        >
          Enrolled
        </button>
      </div>

      {filteredList.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-blue-50 text-blue-600">
              <GraduationCap className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery
                ? "No classes found"
                : activeTab === "teaching"
                  ? "No Classes Yet"
                  : "No Enrolled Classes"}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? "Try adjusting your search query to find classes."
                : activeTab === "teaching"
                  ? "You haven't created any classes yet. Get started by creating your first class."
                  : "You haven't enrolled in any classes yet. Browse available classes to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredList.map((item) => <ClassCard key={item.id} data={item} />)}
        </div>
      )}
    </div>
  )
}

function ClassCard({ data }: { data: ClassCardData }) {
  const classColor = data.color || "#3b82f6"
  const teacherInitials = data.teacherName
    ? data.teacherName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "T"
  
  return (
    <Link href={`/home/classes/${data.id}`}>
      <div className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer">
        <div 
          className="relative h-24"
          style={{ backgroundColor: classColor }}
        >
          <div 
            className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm"
            style={{ color: classColor }}
          >
            {data.enrolledCount} enrolled
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {data.title}
            </h3>
            {data.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {data.description}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={data.teacherImage || undefined} alt={data.teacherName || "Teacher"} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {teacherInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {data.teacherName || "Teacher"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {data.schedule ? (
                <>
                  <Clock className="h-3.5 w-3.5" style={{ color: classColor }} />
                  <span className="truncate">{data.schedule}</span>
                </>
              ) : (
                <span className="text-muted-foreground/60">No schedule</span>
              )}
            </div>
            {data.category && (
              <span 
                className="rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ 
                  backgroundColor: `${classColor}15`,
                  color: classColor,
                }}
              >
                {data.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

