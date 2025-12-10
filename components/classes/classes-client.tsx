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
    <div className="flex flex-col gap-8">
      {/* Header and Controls */}
      <div className="flex flex-row gap-4 justify-start items-center">
        {/* Tabs */}
        <div className="inline-flex p-1 bg-muted/40 rounded-xl border">
          <button
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out",
              activeTab === "teaching"
                ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
            onClick={() => setActiveTab("teaching")}
          >
            Teaching
          </button>
          <button
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out",
              activeTab === "enrolled"
                ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
            onClick={() => setActiveTab("enrolled")}
          >
            Enrolled
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border-0 py-2.5 pl-10 text-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary/20 bg-muted/20 transition-all hover:bg-muted/30 focus:bg-white"
          />
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/5 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <GraduationCap className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {searchQuery
              ? "No classes found"
              : activeTab === "teaching"
                ? "Start your teaching journey"
                : "Start learning today"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? "We couldn't find any classes matching your search. Try adjusting the keywords."
              : activeTab === "teaching"
                ? "Create your first class to start sharing knowledge with students."
                : "Join a class to start learning new skills and connecting with teachers."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
    <Link href={`/home/classes/${data.id}`} className="group block h-full">
      <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
        {/* Banner with Pattern */}
        <div
          className="relative h-28 w-full overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${classColor} 0%, ${classColor}dd 100%)`
          }}
        >
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />

          {/* Enrolled Badge */}
          <div
            className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white shadow-sm border border-white/10"
          >
            {data.enrolledCount} enrolled
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5 pt-10 relative">
          {/* Avatar Floating Over Banner/Content */}
          <div className="absolute -top-7 left-5">
            <Avatar className="h-14 w-14 border-4 border-card shadow-sm">
              <AvatarImage src={data.teacherImage || undefined} alt={data.teacherName || "Teacher"} />
              <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">
                {teacherInitials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-1.5 mb-4">
            <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {data.title}
            </h3>
            {data.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {data.description}
              </p>
            )}
          </div>

          <div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/80">
                {data.teacherName || "Unknown Teacher"}
              </span>
            </div>
            {data.category && (
              <span
                className="px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${classColor}10`,
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

