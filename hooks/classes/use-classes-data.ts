"use client"

import { useEffect, useMemo, useState } from "react"

import { usePrefetch } from "@/hooks/use-prefetch"
import { BackgroundCache } from "@/lib/background-cache"
import { BackgroundSync } from "@/lib/background-sync"
import { useCacheData, useOfflineCollectionCache } from "@/lib/cache-hooks"
import type { ClassCardData } from "@/types/classes"

type UseClassesDataArgs = {
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
  searchQuery: string
}

export function useClassesData({ teachingClasses, enrolledClasses, searchQuery }: UseClassesDataArgs) {
  const { prefetchOnHover, cancelPrefetch } = usePrefetch()
  const [cachedTeaching, setCachedTeaching] = useState<ClassCardData[]>([])
  const [cachedEnrolled, setCachedEnrolled] = useState<ClassCardData[]>([])

  useOfflineCollectionCache<ClassCardData>({
    onlineData: [...teachingClasses, ...enrolledClasses],
    getCachedData: () => BackgroundCache.getInstance().getCachedClasses(),
    onHydrate: (cachedClasses) => {
      setCachedTeaching(cachedClasses.filter((classItem) => classItem.role === "teaching"))
      setCachedEnrolled(cachedClasses.filter((classItem) => classItem.role !== "teaching"))
    },
  })

  // Server props are the source of truth; fall back to the IndexedDB cache
  // only when no server data was provided (e.g. offline first load).
  const resolvedTeaching = teachingClasses.length > 0 ? teachingClasses : cachedTeaching
  const resolvedEnrolled = enrolledClasses.length > 0 ? enrolledClasses : cachedEnrolled

  const allClasses = useMemo(
    () => [...resolvedTeaching, ...resolvedEnrolled],
    [resolvedEnrolled, resolvedTeaching],
  )

  useCacheData(allClasses, "classes", true)

  useEffect(() => {
    if (allClasses.length === 0 || !navigator.onLine) return

    const imageUrls = allClasses
      .map((classItem) => classItem.teacherImage)
      .filter((url): url is string => Boolean(url))

    if (imageUrls.length === 0) return

    BackgroundSync.getInstance().cacheImages(imageUrls)
  }, [allClasses])

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return allClasses

    const queryWords = searchQuery.toLowerCase().trim().split(/\s+/)

    return allClasses.filter((classItem) => {
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
  }, [allClasses, searchQuery])

  return {
    filteredClasses,
    prefetchOnHover,
    cancelPrefetch,
  }
}