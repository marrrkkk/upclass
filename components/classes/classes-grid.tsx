"use client"

import { GraduationCap } from "lucide-react"

import { ClassCard } from "@/components/classes/class-card"
import { EmptyState } from "@/components/ui/empty-state"
import type { ClassCardData } from "@/types/classes"

type ClassesGridProps = {
  searchQuery: string
  classes: ClassCardData[]
  viewMode?: "grid" | "list"
  onHoverStart: (href: string) => void
  onHoverEnd: (href: string) => void
}

export function ClassesGrid({
  searchQuery,
  classes,
  onHoverStart,
  onHoverEnd,
}: ClassesGridProps) {
  if (classes.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCap />}
        tone="primary"
        title={searchQuery ? "No classes found" : "No classes yet"}
        description={
          searchQuery
            ? "We couldn't find any classes matching your search. Try adjusting the keywords."
            : "Classes you create or join will appear here."
        }
        className="min-h-64 rounded-2xl border border-hairline/80 bg-card/60 shadow-2xs"
      />
    )
  }

  return (
    <div
      role="list"
      aria-label="Classes"
      data-view="grid"
      className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-5"
    >
      {classes.map((classItem) => (
        <ClassCard
          key={classItem.id}
          data={classItem}
          layout="grid"
          onHoverStart={onHoverStart}
          onHoverEnd={onHoverEnd}
        />
      ))}
    </div>
  )
}
