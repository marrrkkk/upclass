import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel, PanelBody } from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import type { StudentNextAction } from "./dashboard-types"
import { formatDueDateFull } from "./dashboard-formatters"

type DashboardNextActionProps = {
  nextAction: StudentNextAction | null
  orgSlug: string
}

/**
 * Prominent "continue where you left off" or "next up" section for student dashboard.
 * Shows the most relevant unfinished item or recently graded work.
 */
export function DashboardNextAction({ nextAction, orgSlug }: DashboardNextActionProps) {
  if (!nextAction) {
    return (
      <Panel className="border-success/20 bg-success-surface/10">
        <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <IconBadge tone="success" size="lg" variant="soft">
              <CheckCircle2 className="size-5" />
            </IconBadge>
            <div className="min-w-0 flex-1">
              <Text variant="h3" className="font-semibold text-foreground">All caught up</Text>
              <Text variant="small" tone="muted">
                No urgent work right now. Check your classes for upcoming assignments.
              </Text>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href={`/${orgSlug}/classes`}>Open classes</Link>
          </Button>
        </PanelBody>
      </Panel>
    )
  }

  const statusTone =
    nextAction.status === "graded"
      ? "success"
      : nextAction.status === "submitted"
        ? "info"
        : nextAction.status === "in_progress"
          ? "warning"
          : "neutral"

  const statusLabel =
    nextAction.status === "graded"
      ? "Graded"
      : nextAction.status === "submitted"
        ? "Submitted"
        : nextAction.status === "in_progress"
          ? "In progress"
          : "Not started"

  return (
    <Panel className="relative overflow-hidden border-primary/20 bg-card shadow-2xs">
      <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <CourseSwatch
            value={nextAction.classColor}
            courseKey={nextAction.classId}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-caption font-medium text-foreground-muted">
                {nextAction.status === "graded" ? "Recently graded" : "Next up"}
              </span>
              <StatusBadge tone={statusTone} size="sm">
                {statusLabel}
              </StatusBadge>
            </div>
            <Text variant="h2" className="text-balance font-bold text-foreground">
              {nextAction.title}
            </Text>
            <Text variant="small" tone="muted">
              {nextAction.className}
              {nextAction.dueDate && (
                <>
                  {" · "}
                  {formatDueDateFull(nextAction.dueDate)}
                </>
              )}
              {nextAction.points && (
                <>
                  {" · "}
                  {nextAction.points} {nextAction.points === "1" ? "point" : "points"}
                </>
              )}
            </Text>
            {nextAction.status === "graded" && nextAction.grade && (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="type-h3 font-bold text-success-text">
                  {nextAction.grade}
                </span>
                {nextAction.points && (
                  <Text variant="small" tone="muted">
                    out of {nextAction.points}
                  </Text>
                )}
              </div>
            )}
          </div>
        </div>

        <Button asChild size="default" className="w-full shrink-0 shadow-2xs sm:w-auto">
          <Link href={nextAction.actionHref}>
            {nextAction.actionLabel}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </PanelBody>
    </Panel>
  )
}

