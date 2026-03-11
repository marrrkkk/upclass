"use client"

import { cn } from "@/lib/utils"

type ClassDetailTab = "stream" | "classwork" | "quizzes" | "people"

type ClassDetailTabsProps = {
  activeTab: ClassDetailTab
  classColor: string
  onTabChange: (tab: ClassDetailTab) => void
}

const TABS: Array<{ id: ClassDetailTab; label: string }> = [
  { id: "stream", label: "Stream" },
  { id: "classwork", label: "Classwork" },
  { id: "quizzes", label: "Quizzes" },
  { id: "people", label: "People" },
]

export function getVisibleClassTab(
  requestedTab: string | null,
  fallbackTab: ClassDetailTab,
): ClassDetailTab {
  if (requestedTab === "stream" || requestedTab === "classwork" || requestedTab === "quizzes" || requestedTab === "people") {
    return requestedTab
  }

  return fallbackTab
}

export function ClassDetailTabs({
  activeTab,
  classColor,
  onTabChange,
}: ClassDetailTabsProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b w-full">
      <div className="max-w-4xl mx-auto flex items-center gap-6 px-4 overflow-x-auto whitespace-nowrap scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "relative py-3 text-sm font-medium transition-colors hover:text-foreground flex-shrink-0",
              activeTab === tab.id ? "text-primary" : "text-muted-foreground",
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {activeTab === tab.id && (
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
