"use client"

import { useEffect, useMemo, useState } from "react"

import { BackgroundCache } from "@/lib/background-cache"
import { ClassesGrid } from "@/components/classes/classes-grid"
import { ClassesSearchControls } from "@/components/classes/classes-search-controls"
import { ClassCardSkeleton } from "@/components/skeletons"
import { usePrefetch } from "@/hooks/use-prefetch"
import { useClassesStore } from "@/stores/classes-store"

import type { ClassCardData } from "@/types/classes"

type ClassesClientProps = {
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
  userRole: "teacher" | "student" | null
  isAuthenticated?: boolean
  isLoading?: boolean
}

export function ClassesClient({
  teachingClasses,
  enrolledClasses,
  userRole,
  isAuthenticated = false,
  isLoading = false,
}: ClassesClientProps) {
  const setTeachingClasses = useClassesStore((state) => state.setTeachingClasses)
  const setEnrolledClasses = useClassesStore((state) => state.setEnrolledClasses)
  const setStoreIsAuthenticated = useClassesStore((state) => state.setIsAuthenticated)
  const storeTeachingClasses = useClassesStore((state) => state.teachingClasses)
  const storeEnrolledClasses = useClassesStore((state) => state.enrolledClasses)
  const [searchQuery, setSearchQuery] = useState("")
  const { prefetchOnHover, cancelPrefetch } = usePrefetch()

  useEffect(() => {
    const hasServerClasses = teachingClasses.length > 0 || enrolledClasses.length > 0
    const isOffline = typeof window !== "undefined" && !navigator.onLine

    if (isOffline && !hasServerClasses) {
      return
    }

    setTeachingClasses(teachingClasses)
    setEnrolledClasses(enrolledClasses)
    setStoreIsAuthenticated(isAuthenticated)
  }, [
    enrolledClasses,
    isAuthenticated,
    setEnrolledClasses,
    setStoreIsAuthenticated,
    setTeachingClasses,
    teachingClasses,
  ])

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
    }

    void hydrateOfflineClasses()

    return () => {
      cancelled = true
    }
  }, [setEnrolledClasses, setStoreIsAuthenticated, setTeachingClasses])

  const visibleClasses = userRole === "student" ? storeEnrolledClasses : storeTeachingClasses

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return visibleClasses

    const queryWords = searchQuery.toLowerCase().trim().split(/\s+/)

    return visibleClasses.filter((classItem) => {
      const searchableText = [
        classItem.title,
        classItem.description,
        classItem.category,
        classItem.teacherName,
        classItem.schedule,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return queryWords.every((word) => searchableText.includes(word))
    })
  }, [searchQuery, visibleClasses])

  return (
    <div className="flex flex-col gap-8">
      <ClassesSearchControls
        userRole={userRole}
        isAuthenticated={isAuthenticated}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ClassCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <ClassesGrid
          userRole={userRole}
          searchQuery={searchQuery}
          classes={filteredClasses}
          onHoverStart={prefetchOnHover}
          onHoverEnd={cancelPrefetch}
        />
      )}
    </div>
  )
}
