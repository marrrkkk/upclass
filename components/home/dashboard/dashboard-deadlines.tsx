import Link from "next/link"
import { ArrowRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { Panel, PanelActions, PanelBody, PanelHeader, PanelHeading, PanelTitle } from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import type { DashboardDeadline } from "./dashboard-types"
import { DashboardEmptyState } from "./dashboard-empty-state"
import { formatDueDate } from "./dashboard-formatters"

type DashboardDeadlinesProps = {
  deadlines: DashboardDeadline[]
  orgSlug: string
  role: "teacher" | "student"
  limit?: number
}

/**
 * Upcoming deadline list for teacher or student dashboard rail.
 * Teacher variant shows submission counts; student variant shows submission status.
 */
export function DashboardDeadlines({
  deadlines,
  orgSlug,
  role,
  limit = 4,
}: DashboardDeadlinesProps) {
  const visible = deadlines.slice(0, limit)

  return (
    <Panel padding="none" className="overflow-hidden">
      <PanelHeader>
        <PanelHeading>
          <PanelTitle>
            <CalendarDays aria-hidden="true" className="size-4 text-primary-text" />
            {role === "teacher" ? "Upcoming classwork" : "Upcoming"}
          </PanelTitle>
        </PanelHeading>
        <PanelActions>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${orgSlug}/calendar`}>
              Calendar <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </PanelActions>
      </PanelHeader>
      <PanelBody className="p-0">
        {visible.length === 0 ? (
          <DashboardEmptyState
            title={role === "teacher" ? "No upcoming classwork" : "Nothing due soon"}
            description={
              role === "teacher"
                ? "New assignments and quizzes will appear here."
                : "New coursework with a deadline will appear here."
            }
            compact
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {visible.map((deadline) => (
              <li key={deadline.id}>
                <Link
                  href={`/${orgSlug}/classes/${deadline.classId}?tab=classwork`}
                  className="touch-target focus-ring group grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 transition-colors hover:bg-surface-hover sm:grid-cols-[3.5rem_minmax(0,1fr)]"
                >
                  <span className="type-caption font-medium text-foreground-secondary">
                    {formatDueDate(deadline.dueDate)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <CourseSwatch
                        value={deadline.classColor}
                        courseKey={deadline.classId}
                        size="sm"
                      />
                      <Text as="span" variant="h4" truncate>
                        {deadline.title}
                      </Text>
                    </span>
                    <Text variant="caption" tone="muted" truncate>
                      {deadline.className} · {deadline.type === "quiz" ? "Quiz" : "Assignment"}
                      {role === "teacher" &&
                        deadline.submissionCount !== undefined &&
                        deadline.totalStudents !== undefined && (
                          <>
                            {" · "}
                            {deadline.submissionCount}/{deadline.totalStudents} submitted
                          </>
                        )}
                    </Text>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  )
}
