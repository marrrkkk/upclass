"use client"

import { useState } from "react"

import { ClassesGrid } from "@/components/classes/classes-grid"
import { ClassesSearchControls } from "@/components/classes/classes-search-controls"
import { useClassesData } from "@/hooks/classes/use-classes-data"

import type { ClassCardData } from "@/types/classes"

type ClassesClientProps = {
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
  isAuthenticated?: boolean
}

export function ClassesClient({
  teachingClasses,
  enrolledClasses,
  isAuthenticated = false,
}: ClassesClientProps) {
  const [activeTab, setActiveTab] = useState<"teaching" | "enrolled">("teaching")
  const [searchQuery, setSearchQuery] = useState("")
  const { filteredClasses, prefetchOnHover, cancelPrefetch } = useClassesData({
    teachingClasses,
    enrolledClasses,
    isAuthenticated,
    activeTab,
    searchQuery,
  })

  return (
    <div className="flex flex-col gap-8">
      <ClassesSearchControls
        activeTab={activeTab}
        searchQuery={searchQuery}
        onTabChange={setActiveTab}
        onSearchChange={setSearchQuery}
      />
      <ClassesGrid
        activeTab={activeTab}
        searchQuery={searchQuery}
        classes={filteredClasses}
        onHoverStart={prefetchOnHover}
        onHoverEnd={cancelPrefetch}
      />
    </div>
  )
}
