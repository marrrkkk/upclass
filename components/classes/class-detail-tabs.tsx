"use client"

import { cn } from "@/lib/utils"
import {
  type ClassDetailTab,
} from "@/lib/classes/class-detail-tabs"
import { useClassDetailTabState } from "@/components/classes/class-detail-tab-provider"

type ClassDetailTabsProps = {
  activeTab: ClassDetailTab
  classColor: string
  classId: string
}

const TABS: Array<{ id: ClassDetailTab; label: string }> = [
  { id: "stream", label: "Stream" },
  { id: "classwork", label: "Classwork" },
  { id: "quizzes", label: "Quizzes" },
  { id: "people", label: "People" },
]

export function ClassDetailTabs({
  activeTab: _activeTab,
  classColor,
  classId: _classId,
}: ClassDetailTabsProps) {
  const { optimisticTab, isNavigating, navigateToTab, prefetchTab } = useClassDetailTabState()
  const currentTab = optimisticTab

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b w-full">
      <div className="max-w-4xl mx-auto flex items-center gap-6 px-4 overflow-x-auto whitespace-nowrap scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onMouseEnter={() => prefetchTab(tab.id)}
            onClick={() => {
              if (tab.id === currentTab && !isNavigating) return
              navigateToTab(tab.id)
            }}
            className={cn(
              "relative py-3 text-sm font-medium transition-colors hover:text-foreground flex-shrink-0",
              currentTab === tab.id ? "text-primary" : "text-muted-foreground",
              isNavigating && currentTab === tab.id ? "opacity-100" : "",
            )}
          >
            {tab.label}
            {currentTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-full"
                style={{ backgroundColor: classColor }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
