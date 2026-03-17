import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  BadgeCheck,
  BookMarked,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  NotebookPen,
  PenSquare,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { type ActivityLogItem } from "@/lib/activity-ui"

type ActivityLogListProps = {
  items: ActivityLogItem[]
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

function getActivityIcon(eventType: string) {
  if (eventType === "class_created" || eventType === "class_joined") return GraduationCap
  if (eventType === "announcement_created") return NotebookPen
  if (eventType === "resource_uploaded") return FolderOpen
  if (eventType === "submission_graded" || eventType === "quiz_graded") return BadgeCheck
  if (eventType === "assignment_submitted" || eventType === "quiz_submitted") return FileCheck2
  if (eventType === "quiz_created") return BookMarked
  return PenSquare
}

export function ActivityLogList({
  items,
  emptyTitle = "No activity yet",
  emptyDescription = "Your recent work will show up here once you start using classes, assignments, and resources.",
  className,
}: ActivityLogListProps) {
  if (items.length === 0) {
    return (
      <Empty className={cn("border bg-muted/10", className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NotebookPen />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => {
        const Icon = getActivityIcon(item.eventType)

        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-3 transition-all hover:border-border hover:bg-muted/30"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                {item.className ? (
                  <Badge variant="outline" className="rounded-full">
                    {item.className}
                  </Badge>
                ) : null}
              </div>

              {item.description ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
              ) : null}

              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
