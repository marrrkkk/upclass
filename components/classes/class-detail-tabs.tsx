"use client"

import Link from "next/link"
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  PenTool,
  Rss,
  Users,
  type LucideIcon,
} from "lucide-react"

import { useClassDetailTabState } from "@/components/classes/class-detail-tab-provider"
import { Button } from "@/components/ui/button"
import { tabsListVariants, tabsTriggerVariants } from "@/components/ui/tabs"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { type ClassDetailTab } from "@/lib/classes/class-detail-tabs"
import { cn } from "@/lib/utils"

type ClassDetailTabsProps = {
  classId: string
  /** Tabs the current role can actually see (server-computed). */
  visibleTabs: ClassDetailTab[]
}

const TAB_META: Record<ClassDetailTab, { label: string; icon: LucideIcon }> = {
  stream: { label: "Stream", icon: Rss },
  classwork: { label: "Classwork", icon: BookOpen },
  quizzes: { label: "Quizzes", icon: ClipboardList },
  gradebook: { label: "Gradebook", icon: GraduationCap },
  people: { label: "People", icon: Users },
}

export function ClassDetailTabs({
  classId,
  visibleTabs,
}: ClassDetailTabsProps) {
  const { optimisticTab, isNavigating, navigateToTab, prefetchTab } = useClassDetailTabState()
  const organizationPath = useOrganizationPath()
  const whiteboardHref = organizationPath(`/classes/${classId}/whiteboard`)

  return (
    <div className="flex items-center justify-between gap-2 border-b border-hairline">
      <nav aria-label="Class sections" className="min-w-0 flex-1 overflow-x-auto">
        <div className={cn(tabsListVariants({ variant: "line" }), "min-w-max border-b-0")}>
          {visibleTabs.map((tabId) => {
            const { label, icon: Icon } = TAB_META[tabId]
            const isActive = optimisticTab === tabId

            return (
              <button
                key={tabId}
                type="button"
                data-state={isActive ? "active" : "inactive"}
                aria-current={isActive ? "page" : undefined}
                aria-busy={isNavigating && isActive ? true : undefined}
                onMouseEnter={() => prefetchTab(tabId)}
                onClick={() => {
                  if (tabId === optimisticTab && !isNavigating) return
                  navigateToTab(tabId)
                }}
                className={tabsTriggerVariants({ variant: "line" })}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
      </nav>

      <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 rounded-lg border-hairline/80 bg-surface-raised/60 text-xs font-semibold shadow-2xs hover:bg-surface">
        <Link href={whiteboardHref}>
          <PenTool className="size-3.5" aria-hidden="true" />
          Whiteboard
        </Link>
      </Button>
    </div>
  )
}