"use client"

import { Suspense, use, useLayoutEffect, useMemo, useState } from "react"

import { ClassesGrid } from "@/components/classes/classes-grid"
import { ClassesPageShell } from "@/components/classes/classes-page-shell"
import { ClassesSearchControls } from "@/components/classes/classes-search-controls"
import { CreateClassButton } from "@/components/classes/create-class-button"
import { JoinClassButton } from "@/components/classes/join-class-button"
import { ClassesGridSkeleton } from "@/components/skeletons"
import { useClassesData } from "@/hooks/classes/use-classes-data"
import type { ClassCardData } from "@/types/classes"

export type ClassesData = {
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
}

type ClassesClientProps = {
  /**
   * Streaming mode: the class rows resolve from a server-passed promise. The
   * header and search controls render immediately; the grid suspends until
   * the promise resolves. When absent, the array props drive the grid.
   */
  classesPromise?: Promise<ClassesData>
  teachingClasses?: ClassCardData[]
  enrolledClasses?: ClassCardData[]
  isAuthenticated?: boolean
  canCreateClass?: boolean
  orgSlug: string
}

export function ClassesClient({
  classesPromise,
  teachingClasses = [],
  enrolledClasses = [],
  isAuthenticated = false,
  canCreateClass = false,
  orgSlug,
}: ClassesClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [resultCount, setResultCount] = useState<number | undefined>(undefined)

  return (
    <ClassesPageShell
      actions={
        isAuthenticated ? (
          <div className="flex items-center gap-2.5">
            <JoinClassButton />
            {canCreateClass ? <CreateClassButton orgSlug={orgSlug} /> : null}
          </div>
        ) : null
      }
    >
      <ClassesSearchControls
        searchQuery={searchQuery}
        resultCount={resultCount}
        sortOrder={sortOrder}
        onSearchChange={setSearchQuery}
        onSortChange={setSortOrder}
        onReset={() => {
          setSearchQuery("")
          setSortOrder("newest")
        }}
      />

      <Suspense fallback={<ClassesGridSkeleton />}>
        <ClassesGridResolved
          classesPromise={classesPromise}
          teachingClasses={teachingClasses}
          enrolledClasses={enrolledClasses}
          searchQuery={searchQuery}
          sortOrder={sortOrder}
          onCountChange={setResultCount}
        />
      </Suspense>
    </ClassesPageShell>
  )
}

function ClassesGridResolved({
  classesPromise,
  teachingClasses,
  enrolledClasses,
  searchQuery,
  sortOrder,
  onCountChange,
}: {
  classesPromise?: Promise<ClassesData>
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
  searchQuery: string
  sortOrder: "newest" | "oldest"
  onCountChange: (count: number) => void
}) {
  const resolved = classesPromise
    ? use(classesPromise)
    : { teachingClasses, enrolledClasses }

  const { filteredClasses, prefetchOnHover, cancelPrefetch } = useClassesData({
    teachingClasses: resolved.teachingClasses,
    enrolledClasses: resolved.enrolledClasses,
    searchQuery,
  })

  const sortedClasses = useMemo(
    () =>
      [...filteredClasses].sort((a, b) => {
        const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        return sortOrder === "newest" ? difference : -difference
      }),
    [filteredClasses, sortOrder],
  )

  useLayoutEffect(() => {
    onCountChange(sortedClasses.length)
  }, [onCountChange, sortedClasses.length])

  return (
    <ClassesGrid
      searchQuery={searchQuery}
      classes={sortedClasses}
      onHoverStart={prefetchOnHover}
      onHoverEnd={cancelPrefetch}
    />
  )
}