"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { ClassDetailTabSkeleton } from "@/components/skeletons"
import { type ClassDetailTab } from "@/lib/classes/class-detail-tabs"
import { useOrganizationPath } from "@/hooks/use-organization-path"

type ClassDetailTabContextValue = {
  activeTab: ClassDetailTab
  optimisticTab: ClassDetailTab
  isNavigating: boolean
  cachedTabs: Set<ClassDetailTab>
  navigateToTab: (tab: ClassDetailTab) => void
  prefetchTab: (tab: ClassDetailTab) => void
}

const ClassDetailTabContext = createContext<ClassDetailTabContextValue | null>(null)

export function ClassDetailTabProvider({
  activeTab,
  classId,
  visibleTabs,
  children,
}: {
  activeTab: ClassDetailTab
  classId: string
  /** Tabs this role can navigate to; only these get prefetched. */
  visibleTabs: ClassDetailTab[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const organizationPath = useOrganizationPath()
  const [isPending, startTransition] = useTransition()
  const [optimisticTab, setOptimisticTab] = useState<ClassDetailTab>(activeTab)
  const [cachedTabs, setCachedTabs] = useState<Set<ClassDetailTab>>(
    () => new Set([activeTab]),
  )

  useEffect(() => {
    setOptimisticTab(activeTab)
  }, [activeTab])

  useEffect(() => {
    setCachedTabs((prev) => {
      if (prev.has(activeTab)) return prev
      const next = new Set(prev)
      next.add(activeTab)
      return next
    })
  }, [activeTab])

  useEffect(() => {
    visibleTabs.forEach((tab) => {
      const href = tab === "stream" ? organizationPath(`/classes/${classId}`) : organizationPath(`/classes/${classId}?tab=${tab}`)
      router.prefetch(href)
    })
  }, [classId, organizationPath, router, visibleTabs])

  const prefetchTab = (tab: ClassDetailTab) => {
    const href = tab === "stream" ? organizationPath(`/classes/${classId}`) : organizationPath(`/classes/${classId}?tab=${tab}`)
    router.prefetch(href)
  }

  const navigateToTab = (tab: ClassDetailTab) => {
    if (tab === optimisticTab && !isPending) return

    setOptimisticTab(tab)

    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      if (tab === "stream") {
        params.delete("tab")
      } else {
        params.set("tab", tab)
      }

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  const value = useMemo(
    () => ({
      activeTab,
      optimisticTab,
      isNavigating: isPending || optimisticTab !== activeTab,
      cachedTabs,
      navigateToTab,
      prefetchTab,
    }),
    [activeTab, cachedTabs, isPending, optimisticTab],
  )

  return (
    <ClassDetailTabContext.Provider value={value}>
      {children}
    </ClassDetailTabContext.Provider>
  )
}

export function useClassDetailTabState() {
  const value = useContext(ClassDetailTabContext)

  if (!value) {
    throw new Error("useClassDetailTabState must be used within ClassDetailTabProvider")
  }

  return value
}

export function ClassDetailTabContentBoundary({
  serverActiveTab,
  children,
}: {
  serverActiveTab: ClassDetailTab
  children: React.ReactNode
}) {
  const { optimisticTab, isNavigating, cachedTabs } = useClassDetailTabState()

  if (isNavigating && optimisticTab !== serverActiveTab && !cachedTabs.has(optimisticTab)) {
    return <ClassDetailTabSkeleton activeTab={optimisticTab} />
  }

  return <>{children}</>
}
