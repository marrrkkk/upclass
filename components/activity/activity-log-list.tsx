"use client"

import { formatDistanceToNow } from "date-fns"
import {
  BadgeCheck,
  BookMarked,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  NotebookPen,
  PenSquare,
  type LucideIcon,
} from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { TimelineRow } from "@/components/ui/timeline-row"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { type ActivityLogItem } from "@/lib/activity-ui"
import { type Tone } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type ActivityLogListProps = {
  items: ActivityLogItem[]
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

type ActivityPresentation = {
  Icon: LucideIcon
  tone: Tone
}

function getActivityPresentation(eventType: string): ActivityPresentation {
  if (eventType === "class_created" || eventType === "class_joined") {
    return { Icon: GraduationCap, tone: "info" }
  }
  if (eventType === "announcement_created") {
    return { Icon: NotebookPen, tone: "primary" }
  }
  if (eventType === "resource_uploaded") {
    return { Icon: FolderOpen, tone: "neutral" }
  }
  if (eventType === "submission_graded" || eventType === "quiz_graded") {
    return { Icon: BadgeCheck, tone: "success" }
  }
  if (eventType === "assignment_submitted" || eventType === "quiz_submitted") {
    return { Icon: FileCheck2, tone: "info" }
  }
  if (eventType === "quiz_created") {
    return { Icon: BookMarked, tone: "warning" }
  }
  return { Icon: PenSquare, tone: "neutral" }
}

export function ActivityLogList({
  items,
  emptyTitle = "No activity yet",
  emptyDescription = "Your recent work will show up here once you start using classes, assignments, and resources.",
  className,
}: ActivityLogListProps) {
  const organizationPath = useOrganizationPath()

  if (items.length === 0) {
    return (
      <EmptyState
        className={className}
        icon={<NotebookPen aria-hidden="true" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div
      role="list"
      aria-label="Activity timeline"
      className={cn("divide-y divide-hairline", className)}
    >
      {items.map((item) => {
        const { Icon, tone } = getActivityPresentation(item.eventType)

        return (
          <TimelineRow
            key={item.id}
            role="listitem"
            href={organizationPath(item.href)}
            icon={<Icon aria-hidden="true" />}
            tone={tone}
            title={item.title}
            description={item.description ? <span className="line-clamp-2 break-words">{item.description}</span> : undefined}
            timestamp={formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
            dateTime={item.occurredAt}
            trailing={item.className ? (
              <StatusBadge tone="neutral" title={item.className} size="sm" className="hidden max-w-32 sm:block sm:max-w-40">
                <span className="block truncate">{item.className}</span>
              </StatusBadge>
            ) : undefined}
          />
        )
      })}
    </div>
  )
}
