import Link from "next/link"
import { ArrowRight, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { Panel } from "@/components/ui/panel"
import { SectionHeader } from "@/components/ui/section"
import { Text } from "@/components/ui/typography"
import type { DashboardClassItem } from "./dashboard-types"
import { DashboardEmptyState } from "./dashboard-empty-state"
import { DashboardSection } from "./dashboard-shell"
import { formatDueDate } from "./dashboard-formatters"

type DashboardClassListProps = {
  classes: DashboardClassItem[]
  orgSlug: string
  role: "teacher" | "student"
  limit?: number
}

/**
 * Compact class directory preview for dashboard.
 * Shows class identity, member count, and optional next due item.
 */
export function DashboardClassList({
  classes,
  orgSlug,
  role,
  limit = 6,
}: DashboardClassListProps) {
  const title = role === "teacher" ? "Your classes" : "Classes"
  const description = role === "teacher" 
    ? "The workspaces you teach in."
    : "Your enrolled classes."
  
  const visible = classes.slice(0, limit)

  return (
    <DashboardSection>
      <SectionHeader
        title={title}
        description={description}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${orgSlug}/classes`}>
              All classes <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <Panel padding="none" className="overflow-hidden">
        {visible.length === 0 ? (
          <DashboardEmptyState
            icon={Building2}
            title="No classes yet"
            description={
              role === "teacher"
                ? "Create a class to start teaching."
                : "Join a class to start learning."
            }
            tone="neutral"
            action={
              <Button asChild>
                <Link href={`/${orgSlug}/classes`}>Browse classes</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {visible.map((classItem) => (
              <li key={classItem.id}>
                <Link
                  href={`/${orgSlug}/classes/${classItem.id}`}
                  className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-subtle/70 sm:px-5 sm:py-4"
                >
                  <CourseSwatch
                    value={classItem.color}
                    courseKey={classItem.id}
                    size="md"
                  />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <Text
                      as="span"
                      variant="h4"
                      truncate
                      className="block font-semibold text-foreground group-hover:text-primary-text"
                    >
                      {classItem.title}
                    </Text>
                    <Text as="span" variant="caption" tone="muted" truncate className="block">
                      {classItem.category || classItem.description || (role === "teacher" ? "Teaching" : "Enrolled")}
                      {" · "}
                      {classItem.memberCount} {classItem.memberCount === 1 ? "student" : "students"}
                      {classItem.nextDueItem && (
                        <>
                          {" · "}
                          {classItem.nextDueItem.title} due {formatDueDate(classItem.nextDueItem.dueDate)}
                        </>
                      )}
                    </Text>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </DashboardSection>
  )
}
