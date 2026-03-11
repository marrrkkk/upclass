"use client"

import { GraduationCap } from "lucide-react"

import { ClassCard } from "@/components/classes/class-card"

import type { ClassCardData } from "@/types/classes"

type ClassesGridProps = {
  activeTab: "teaching" | "enrolled"
  searchQuery: string
  classes: ClassCardData[]
  onHoverStart: (href: string) => void
  onHoverEnd: (href: string) => void
}

export function ClassesGrid({
  activeTab,
  searchQuery,
  classes,
  onHoverStart,
  onHoverEnd,
}: ClassesGridProps) {
  if (classes.length === 0) {
    return (
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
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {classes.map((classItem) => (
        <ClassCard
          key={classItem.id}
          data={classItem}
          onHoverStart={onHoverStart}
          onHoverEnd={onHoverEnd}
        />
      ))}
    </div>
  )
}
