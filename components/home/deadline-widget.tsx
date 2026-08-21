"use client"

import { memo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react"
import {
  differenceInHours,
  format,
  formatDistanceToNow,
  isPast,
  isToday,
  isTomorrow,
} from "date-fns"

import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { IconBadge } from "@/components/ui/icon-badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Panel,
  PanelActions,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { usePrefetch } from "@/hooks/use-prefetch"
import type { Tone } from "@/lib/design-system"

export type DeadlineItem = {
  id: string
  title: string
  type: "assignment" | "quiz" | "material"
  dueDate: Date
  classId: string
  className: string
  classColor: string | null
  points?: string | null
  isSubmitted?: boolean
}

type DeadlineWidgetProps = {
  deadlines: DeadlineItem[]
  role: "teacher" | "student" | null
}

type Urgency = "overdue" | "urgent" | "soon" | "normal"

function getUrgencyLevel(dueDate: Date): Urgency {
  if (isPast(dueDate)) return "overdue"
  const hoursLeft = differenceInHours(dueDate, new Date())
  if (hoursLeft <= 24) return "urgent"
  if (hoursLeft <= 72) return "soon"
  return "normal"
}

function getDeadlineStatus(deadline: DeadlineItem, urgency: Urgency) {
  if (deadline.isSubmitted) return { label: "Submitted", tone: "success" as Tone }
  if (urgency === "overdue") return { label: "Overdue", tone: "danger" as Tone }
  if (urgency === "urgent") return { label: "Due soon", tone: "warning" as Tone }
  if (urgency === "soon") return { label: "Upcoming", tone: "info" as Tone }
  return null
}

function formatDueDate(date: Date) {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  return format(date, "MMM d")
}

function deadlineTypeLabel(type: DeadlineItem["type"]) {
  if (type === "quiz") return "Quiz"
  if (type === "material") return "Material"
  return "Assignment"
}

const DeadlineRow = memo(function DeadlineRow({ deadline }: { deadline: DeadlineItem }) {
  const organizationPath = useOrganizationPath()
  const { prefetchOnHover, cancelPrefetch } = usePrefetch()
  const urgency = getUrgencyLevel(deadline.dueDate)
  const status = getDeadlineStatus(deadline, urgency)
  const classHref = organizationPath(`/classes/${deadline.classId}`)

  return (
    <li>
      <Link
        href={classHref}
        onMouseEnter={() => prefetchOnHover(classHref)}
        onMouseLeave={() => cancelPrefetch(classHref)}
        className="touch-target group row-interactive focus-ring flex items-start gap-3 px-4 py-3"
      >
        <CourseSwatch
          value={deadline.classColor}
          courseKey={deadline.classId}
          label={`${deadline.className} course color`}
          size="md"
        />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Text variant="h4" as="span" truncate className="max-w-full">
              {deadline.title}
            </Text>
            {status ? (
              <StatusBadge tone={status.tone} dot>
                {status.label}
              </StatusBadge>
            ) : null}
          </div>
          <Text variant="caption" tone="muted" truncate>
            {deadline.className} · {deadlineTypeLabel(deadline.type)}
          </Text>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Text variant="caption" tone="muted" as="span" className="flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3" />
              {formatDueDate(deadline.dueDate)} ·{" "}
              {formatDistanceToNow(deadline.dueDate, { addSuffix: true })}
            </Text>
            {deadline.points ? (
              <Text variant="caption" tone="subtle" as="span">
                {deadline.points} pts
              </Text>
            ) : null}
          </div>
        </div>

        <ArrowRight
          aria-hidden="true"
          className="mt-2 hidden size-4 shrink-0 text-muted-foreground/50 group-hover:text-foreground sm:block"
        />
      </Link>
    </li>
  )
})

function AllDeadlinesDialog({
  deadlines,
  role,
  open,
  onOpenChange,
}: {
  deadlines: DeadlineItem[]
  role: "teacher" | "student" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="All upcoming deadlines"
      description={
        role === "teacher"
          ? `${deadlines.length} upcoming deadlines across your classes.`
          : `${deadlines.length} assignments due.`
      }
      desktopClassName="sm:max-w-2xl"
    >
      {deadlines.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 />}
          tone="success"
          title="All caught up"
          description={
            role === "teacher"
              ? "There are no upcoming deadlines scheduled for your classes."
              : "You have no pending assignments at the moment."
          }
        />
      ) : (
        <ul className="divide-y divide-hairline -mx-4">
          {deadlines.map((deadline) => (
            <DeadlineRow key={deadline.id} deadline={deadline} />
          ))}
        </ul>
      )}
    </ResponsiveOverlay>
  )
}

export function DeadlineWidget({ deadlines, role }: DeadlineWidgetProps) {
  const [open, setOpen] = useState(false)
  const sortedDeadlines = [...deadlines].sort(
    (first, second) =>
      new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime(),
  )

  return (
    <>
      <AllDeadlinesDialog
        deadlines={sortedDeadlines}
        role={role}
        open={open}
        onOpenChange={setOpen}
      />

      <Panel padding="none" variant="panel" className="flex h-full flex-col overflow-hidden">
        <PanelHeader>
          <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
            <IconBadge tone="warning" size="md">
              <Calendar aria-hidden="true" />
            </IconBadge>
            <div className="min-w-0 space-y-1">
              <PanelTitle>{role === "teacher" ? "Next deadlines" : "Next up"}</PanelTitle>
              <PanelDescription>
                {sortedDeadlines.length === 0
                  ? "Nothing needs attention right now."
                  : `${sortedDeadlines.length} ${sortedDeadlines.length === 1 ? "item" : "items"} on your timeline.`}
              </PanelDescription>
            </div>
          </PanelHeading>
          <PanelActions>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              View all
              <ArrowRight aria-hidden="true" />
            </Button>
          </PanelActions>
        </PanelHeader>

        <PanelBody className="flex-1 p-0">
          {sortedDeadlines.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 />}
              tone="success"
              title="All caught up"
              description={
                role === "teacher"
                  ? "No upcoming deadlines in your classes."
                  : "You have no pending assignments."
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-hairline">
                {sortedDeadlines.slice(0, 5).map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </ul>
              {sortedDeadlines.length > 5 ? (
                <div className="border-t border-hairline p-2">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setOpen(true)}>
                    Show {sortedDeadlines.length - 5} more
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </PanelBody>
      </Panel>
    </>
  )
}
