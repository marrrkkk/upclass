"use client"

import { useEffect, useState } from "react"

import { BackgroundCache } from "@/lib/background-cache"
import { ClassesGrid } from "@/components/classes/classes-grid"
import { ClassesSearchControls } from "@/components/classes/classes-search-controls"
import { useClassesData } from "@/hooks/classes/use-classes-data"
import { useClassesStore } from "@/stores/classes-store"

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
  const setTeachingClasses = useClassesStore((state) => state.setTeachingClasses)
  const setEnrolledClasses = useClassesStore((state) => state.setEnrolledClasses)
  const setStoreIsAuthenticated = useClassesStore((state) => state.setIsAuthenticated)
  const [activeTab, setActiveTab] = useState<"teaching" | "enrolled">("teaching")
  const [searchQuery, setSearchQuery] = useState("")
  const { filteredClasses, prefetchOnHover, cancelPrefetch } = useClassesData({
    teachingClasses,
    enrolledClasses,
    isAuthenticated,
    activeTab,
    searchQuery,
  })

  useEffect(() => {
    if (typeof window === "undefined" || navigator.onLine) return

    let cancelled = false

    const hydrateOfflineClasses = async () => {
      const cachedClasses = await BackgroundCache.getInstance().getCachedClasses()
      if (cancelled || cachedClasses.length === 0) return

      const teaching = cachedClasses.filter((classItem) => classItem.role === "teaching")
      const enrolled = cachedClasses.filter((classItem) => classItem.role !== "teaching")

      setTeachingClasses(teaching)
      setEnrolledClasses(enrolled)
      setStoreIsAuthenticated(true)

      if (teaching.length === 0 && enrolled.length > 0) {
        setActiveTab("enrolled")
      }
    }

    void hydrateOfflineClasses()

    return () => {
      cancelled = true
    }
  }, [setEnrolledClasses, setStoreIsAuthenticated, setTeachingClasses])

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
