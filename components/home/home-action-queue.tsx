"use client"

import { memo, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  ListTodo,
} from "lucide-react"
import { differenceInHours, format, isPast, isToday, isTomorrow } from "date-fns"

import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
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

export type StudentActionQueueItem = {
  kind: "classwork"
  id: string
  title: string
  type: "assignment" | "quiz" | "material"
  dueDate: Date | string
  classId: string
  className: string
  classColor: string | null
  points?: string | null
  isSubmitted?: boolean
}

export type TeacherActionQueueItem =
  | {
      kind: "submission"
      id: string
      submissionId: string
      title: string
      studentName: string
      classId: string
      className: string
      classColor: string | null
      submittedAt: Date | string | null
      attachmentCount: number
    }
  | {
      kind: "overdue_alert"
      id: string
      count: number
      title: string
      classId?: string
      className?: string
    }
  | {
      kind: "question"
      id: string
      count: number
      title: string
      classId?: string
      className?: string
    }

export type ActionQueueItem = StudentActionQueueItem | TeacherActionQueueItem

type HomeActionQueueProps = {
  items: ActionQueueItem[]
  role: "teacher" | "student" | null
  footer?: ReactNode
  summary?: {
    graded: number
    unreadQuestions: number
    overdue: number
  }
}

type Urgency = "overdue" | "urgent" | "soon" | "normal"

function calculateUrgency(dateValue: Date | string): Urgency {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue
  if (Number.isNaN(date.getTime())) return "normal"
  if (isPast(date)) return "overdue"
  const hoursLeft = differenceInHours(date, new Date())
  if (hoursLeft <= 24) return "urgent"
  if (hoursLeft <= 72) return "soon"
  return "normal"
}

function formatRelativeDue(dateValue: Date | string): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue
  if (Number.isNaN(date.getTime())) return "No date"
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  return format(date, "MMM d")
}

const StudentQueueRow = memo(function StudentQueueRow({
  item,
}: {
  item: StudentActionQueueItem
}) {
  const organizationPath = useOrganizationPath()
  const { prefetchOnHover, cancelPrefetch } = usePrefetch()
  const urgency = calculateUrgency(item.dueDate)
  const classHref = organizationPath(`/classes/${item.classId}?tab=classwork`)

  let statusBadge: { label: string; tone: Tone } | null = null
  if (item.isSubmitted) {
    statusBadge = { label: "Completed", tone: "success" }
  } else if (urgency === "overdue") {
    statusBadge = { label: "Overdue", tone: "danger" }
  } else if (urgency === "urgent") {
    statusBadge = { label: "Due today", tone: "warning" }
  } else if (urgency === "soon") {
    statusBadge = { label: "Due soon", tone: "info" }
  }

  const typeLabel =
    item.type === "quiz" ? "Quiz" : item.type === "material" ? "Material" : "Assignment"

  return (
    <li>
      <Link
        href={classHref}
        onMouseEnter={() => prefetchOnHover(classHref)}
        onMouseLeave={() => cancelPrefetch(classHref)}
        className="touch-target group row-interactive focus-ring flex items-center gap-3 px-4 py-3 sm:gap-3.5 sm:py-3.5"
      >
        <CourseSwatch
          value={item.classColor}
          courseKey={item.classId}
          label={`${item.className} course color`}
          size="md"
          className="shrink-0"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Text variant="h4" as="span" truncate className="max-w-full font-medium">
              {item.title}
            </Text>
            {statusBadge ? (
              <StatusBadge tone={statusBadge.tone} dot size="sm">
                {statusBadge.label}
              </StatusBadge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground sm:gap-x-2.5">
            <Text variant="caption" tone="muted" truncate>
              {item.className} · {typeLabel}
            </Text>
            <span aria-hidden="true" className="hidden text-hairline-strong sm:inline">·</span>
            <Text variant="caption" tone="muted" as="span" className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3" />
              {formatRelativeDue(item.dueDate)}
            </Text>
            {item.points ? (
              <>
                <span aria-hidden="true" className="hidden text-hairline-strong sm:inline">·</span>
                <Text variant="caption" tone="subtle" as="span">
                  {item.points} pts
                </Text>
              </>
            ) : null}
          </div>
        </div>

        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
        />
      </Link>
    </li>
  )
})

const TeacherQueueRow = memo(function TeacherQueueRow({
  item,
}: {
  item: TeacherActionQueueItem
}) {
  const organizationPath = useOrganizationPath()
  const { prefetchOnHover, cancelPrefetch } = usePrefetch()

  if (item.kind === "submission") {
    const classHref = organizationPath(`/classes/${item.classId}?tab=classwork`)
    return (
      <li>
        <Link
          href={classHref}
          onMouseEnter={() => prefetchOnHover(classHref)}
          onMouseLeave={() => cancelPrefetch(classHref)}
          className="touch-target group row-interactive focus-ring flex items-center gap-3 px-4 py-3 sm:gap-3.5 sm:py-3.5"
        >
          <CourseSwatch
            value={item.classColor}
            courseKey={item.classId}
            label={`${item.className} course color`}
            size="md"
            className="shrink-0"
          />

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Text variant="h4" as="span" truncate className="max-w-full font-medium">
                {item.title}
              </Text>
              <StatusBadge tone="warning" dot size="sm">
                Needs grading
              </StatusBadge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground sm:gap-x-2.5">
              <Text variant="caption" tone="muted" truncate>
                {item.studentName} · {item.className}
              </Text>
              {item.submittedAt ? (
                <>
                  <span aria-hidden="true" className="hidden text-hairline-strong sm:inline">·</span>
                  <Text variant="caption" tone="subtle" as="span">
                    Submitted {formatRelativeDue(item.submittedAt)}
                  </Text>
                </>
              ) : null}
              {item.attachmentCount > 0 ? (
                <>
                  <span aria-hidden="true" className="hidden text-hairline-strong sm:inline">·</span>
                  <Text variant="caption" tone="subtle" as="span">
                    {item.attachmentCount} {item.attachmentCount === 1 ? "file" : "files"}
                  </Text>
                </>
              ) : null}
            </div>
          </div>

          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </Link>
      </li>
    )
  }

  if (item.kind === "question") {
    const messagesHref = organizationPath("/messages")
    return (
      <li>
        <Link
          href={messagesHref}
          onMouseEnter={() => prefetchOnHover(messagesHref)}
          onMouseLeave={() => cancelPrefetch(messagesHref)}
          className="touch-target group row-interactive focus-ring flex items-center gap-3 px-4 py-3 sm:gap-3.5 sm:py-3.5"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-info-surface text-info-text">
            <HelpCircle className="size-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Text variant="h4" as="span" truncate className="max-w-full font-medium">
                {item.title}
              </Text>
              <StatusBadge tone="info" dot size="sm">
                Unread question
              </StatusBadge>
            </div>
            <Text variant="caption" tone="muted" truncate>
              {item.count} student {item.count === 1 ? "message" : "messages"} waiting for a response
            </Text>
          </div>

          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </Link>
      </li>
    )
  }

  if (item.kind === "overdue_alert") {
    const classesHref = organizationPath(item.classId ? `/classes/${item.classId}` : "/classes")
    return (
      <li>
        <Link
          href={classesHref}
          onMouseEnter={() => prefetchOnHover(classesHref)}
          onMouseLeave={() => cancelPrefetch(classesHref)}
          className="touch-target group row-interactive focus-ring flex items-center gap-3 px-4 py-3 sm:gap-3.5 sm:py-3.5"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-destructive-surface text-destructive-text">
            <Clock className="size-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Text variant="h4" as="span" truncate className="max-w-full font-medium">
                {item.title}
              </Text>
              <StatusBadge tone="danger" dot size="sm">
                Overdue
              </StatusBadge>
            </div>
            <Text variant="caption" tone="muted" truncate>
              {item.count} unsubmitted {item.count === 1 ? "assignment" : "assignments"} past deadline
            </Text>
          </div>

          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </Link>
      </li>
    )
  }

  return null
})

function AllItemsDialog({
  items,
  role,
  open,
  onOpenChange,
}: {
  items: ActionQueueItem[]
  role: "teacher" | "student" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={role === "teacher" ? "All teaching queue items" : "All upcoming tasks"}
      description={
        role === "teacher"
          ? `${items.length} items requiring review or attention across your classes.`
          : `${items.length} items on your learning timeline.`
      }
      desktopClassName="sm:max-w-2xl"
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 />}
          tone="success"
          title="All caught up"
          description="There is no work requiring attention right now."
        />
      ) : (
        <ul className="divide-y divide-hairline -mx-4">
          {items.map((item) =>
            role === "teacher" ? (
              <TeacherQueueRow key={item.id} item={item as TeacherActionQueueItem} />
            ) : (
              <StudentQueueRow key={item.id} item={item as StudentActionQueueItem} />
            ),
          )}
        </ul>
      )}
    </ResponsiveOverlay>
  )
}

export function HomeActionQueue({ items, role, footer, summary }: HomeActionQueueProps) {
  const [open, setOpen] = useState(false)

  const sortedItems = useMemo(() => {
    if (role === "teacher") {
      return [...items]
    }

    // Student sort: overdue first, then urgent (<24h), then soon (<72h), then upcoming, then completed
    return [...(items as StudentActionQueueItem[])].sort((a, b) => {
      if (a.isSubmitted !== b.isSubmitted) return a.isSubmitted ? 1 : -1
      const urgA = calculateUrgency(a.dueDate)
      const urgB = calculateUrgency(b.dueDate)
      const rank: Record<Urgency, number> = { overdue: 0, urgent: 1, soon: 2, normal: 3 }
      if (rank[urgA] !== rank[urgB]) return rank[urgA] - rank[urgB]
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [items, role])

  const visibleItems = sortedItems.slice(0, 5)

  return (
    <>
      <AllItemsDialog
        items={sortedItems}
        role={role}
        open={open}
        onOpenChange={setOpen}
      />

      <Panel padding="none" variant="panel" className="flex h-full flex-col overflow-hidden">
        <PanelHeader className="border-b border-hairline px-4 py-3.5 sm:items-start sm:px-5 sm:py-4">
          <PanelHeading className="space-y-1.5">
            <PanelTitle className="type-h2">
              Needs attention
            </PanelTitle>
            <PanelDescription>
              {sortedItems.length === 0
                ? "Nothing needs a decision right now."
                : `${sortedItems.length} ${sortedItems.length === 1 ? "item needs" : "items need"} attention.`}
            </PanelDescription>
          </PanelHeading>
          {summary && role === "teacher" ? (
            <div className="hidden items-center gap-3 text-right sm:flex sm:gap-4">
              <span className="type-caption text-muted-foreground"><strong className="numeric-tabular text-foreground">{summary.graded}</strong> graded</span>
              <span className="type-caption text-muted-foreground"><strong className="numeric-tabular text-foreground">{summary.unreadQuestions}</strong> questions</span>
              <span className="type-caption text-muted-foreground"><strong className="numeric-tabular text-foreground">{summary.overdue}</strong> overdue</span>
            </div>
          ) : null}
          <PanelActions>
            {sortedItems.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                View all ({sortedItems.length})
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : null}
          </PanelActions>
        </PanelHeader>

        <PanelBody className="flex-1 p-0">
          {sortedItems.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-5">
              <CheckCircle2 className="size-6 shrink-0 text-success-text" aria-hidden="true" />
              <div className="min-w-0">
                <Text variant="h3">All caught up</Text>
                <Text variant="small" tone="muted">
                  {role === "teacher"
                    ? "All student submissions are graded and no pending questions remain."
                    : "No incomplete assignments need immediate attention."}
                </Text>
              </div>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-hairline">
                {visibleItems.map((item) =>
                  role === "teacher" ? (
                    <TeacherQueueRow key={item.id} item={item as TeacherActionQueueItem} />
                  ) : (
                    <StudentQueueRow key={item.id} item={item as StudentActionQueueItem} />
                  ),
                )}
              </ul>
              {sortedItems.length > 5 ? (
                <div className="border-t border-hairline p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => setOpen(true)}
                  >
                    Show {sortedItems.length - 5} more
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </PanelBody>
        {footer}
      </Panel>
    </>
  )
}
