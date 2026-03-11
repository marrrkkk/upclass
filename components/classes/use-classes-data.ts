"use client"

import { useEffect, useMemo } from "react"

import { useCacheData } from "@/lib/cache-hooks"
import { usePrefetch } from "@/lib/hooks/use-prefetch"
import { useClassesStore } from "@/lib/stores/classes-store"
import { BackgroundSync } from "@/lib/background-sync"

import type { ClassCardData } from "@/components/classes/types"

type UseClassesDataArgs = {
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
  isAuthenticated: boolean
  activeTab: "teaching" | "enrolled"
  searchQuery: string
}

export function useClassesData({
  teachingClasses,
  enrolledClasses,
  isAuthenticated,
  activeTab,
  searchQuery,
}: UseClassesDataArgs) {
  const {
    setTeachingClasses,
    setEnrolledClasses,
    setIsAuthenticated,
    teachingClasses: storeTeachingClasses,
    enrolledClasses: storeEnrolledClasses,
  } = useClassesStore()
  const { prefetchOnHover, cancelPrefetch } = usePrefetch()

  useEffect(() => {
    setTeachingClasses(teachingClasses)
    setEnrolledClasses(enrolledClasses)
    setIsAuthenticated(isAuthenticated)
  }, [
    enrolledClasses,
    isAuthenticated,
    setEnrolledClasses,
    setIsAuthenticated,
    setTeachingClasses,
    teachingClasses,
  ])

  const allClasses = useMemo(
    () => [...storeTeachingClasses, ...storeEnrolledClasses],
    [storeEnrolledClasses, storeTeachingClasses],
  )

  useCacheData(allClasses, "classes", true)

  useEffect(() => {
    if (allClasses.length === 0 || !navigator.onLine) return

    const imageUrls = allClasses
      .map((classItem) => classItem.teacherImage)
      .filter((url): url is string => !!url)

    if (imageUrls.length === 0) return

    const sync = BackgroundSync.getInstance()
    sync.cacheImages(imageUrls)
  }, [allClasses])

  const visibleClasses = activeTab === "teaching" ? storeTeachingClasses : storeEnrolledClasses

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

  return {
    filteredClasses,
    prefetchOnHover,
    cancelPrefetch,
  }
}
