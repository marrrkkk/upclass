"use client"

import { useEffect, useMemo } from "react"

import { useCacheData, useOfflineCollectionCache } from "@/lib/cache-hooks"
import { BackgroundCache } from "@/lib/background-cache"
import { usePrefetch } from "@/hooks/use-prefetch"
import { useClassesStore } from "@/stores/classes-store"
import { BackgroundSync } from "@/lib/background-sync"

import type { ClassCardData } from "@/types/classes"

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
    const hasServerClasses = teachingClasses.length > 0 || enrolledClasses.length > 0
    const isOffline = typeof window !== "undefined" && !navigator.onLine

    if (isOffline && !hasServerClasses) {
      return
    }

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

  useOfflineCollectionCache<ClassCardData>({
    onlineData: [...teachingClasses, ...enrolledClasses],
    getCachedData: () => BackgroundCache.getInstance().getCachedClasses(),
    onHydrate: (cachedClasses) => {
      const teaching = cachedClasses.filter((classItem) => classItem.role === "teaching")
      const enrolled = cachedClasses.filter((classItem) => classItem.role !== "teaching")

      setTeachingClasses(teaching)
      setEnrolledClasses(enrolled)
      setIsAuthenticated(Boolean(cachedClasses.length))
    },
  })

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
