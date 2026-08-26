import Link from "next/link"
import { redirect } from "next/navigation"
import { eq, and, or, sql, desc, isNotNull, gte, lte } from "drizzle-orm"
import { format, isToday, isTomorrow, startOfDay } from "date-fns"

import { CalendarDays, CheckCircle2 } from "lucide-react"
import { db } from "@/db"
import { classes, classMembership, classwork, submissions } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel, PanelBody, PanelDescription, PanelHeader, PanelHeading, PanelTitle } from "@/components/ui/panel"
import { PageContainer } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { getOptionalSession, getUserRole } from "@/lib/server/auth"

type CalendarItem = {
  id: string
  title: string
  type: "assignment" | "quiz" | "material"
  dueDate: Date
  points: string | null
  classId: string
  className: string
  classColor: string | null
  isSubmitted: boolean
}

function dayLabel(date: Date) {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  return format(date, "EEEE, MMMM d")
}

function itemTypeLabel(type: CalendarItem["type"]) {
  if (type === "quiz") return "Quiz"
  if (type === "material") return "Material"
  return "Assignment"
}

function classworkRange() {
  const rangeStart = startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const rangeEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  return { rangeStart, rangeEnd }
}

export async function CalendarData({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getOptionalSession()
  const { orgSlug } = await params

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const userId = session.user.id
  const userRole = await getUserRole(userId)

  const userClasses = await db
    .select({
      id: classes.id,
      title: classes.title,
      color: classes.color,
      schedule: classes.schedule,
      ownerId: classes.ownerId,
    })
    .from(classes)
    .leftJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(and(or(eq(classes.ownerId, userId), eq(classMembership.userId, userId))))
    .groupBy(classes.id)
    .orderBy(desc(classes.updatedAt))
    .limit(50)

  const classIds = userClasses.map((item) => item.id)
  const { rangeStart, rangeEnd } = classworkRange()

  const upcomingClasswork = classIds.length
    ? await db
        .select({
          id: classwork.id,
          title: classwork.title,
          type: classwork.type,
          dueDate: classwork.dueDate,
          points: classwork.points,
          classId: classwork.classId,
          className: classes.title,
          classColor: classes.color,
        })
        .from(classwork)
        .innerJoin(classes, eq(classwork.classId, classes.id))
        .where(
          and(
            sql`${classwork.classId} IN (${sql.join(classIds.map((entry) => sql`${entry}`), sql`, `)})`,
            isNotNull(classwork.dueDate),
            gte(classwork.dueDate, rangeStart),
            lte(classwork.dueDate, rangeEnd),
          ),
        )
        .orderBy(classwork.dueDate)
    : []

  const submissionStatus =
    userRole === "student" && classIds.length
      ? await db
          .select({ classworkId: submissions.classworkId, status: submissions.status })
          .from(submissions)
          .where(eq(submissions.studentId, userId))
      : []

  const submissionMap = new Map(submissionStatus.map((item) => [item.classworkId, item.status]))

  const items: CalendarItem[] = upcomingClasswork.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    dueDate: new Date(item.dueDate!),
    points: item.points,
    classId: item.classId,
    className: item.className,
    classColor: item.classColor,
    isSubmitted: submissionMap.get(item.id) === "submitted" || submissionMap.get(item.id) === "graded",
  }))

  const grouped = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const key = format(item.dueDate, "yyyy-MM-dd")
    const bucket = grouped.get(key) ?? []
    bucket.push(item)
    grouped.set(key, bucket)
  }

  const dayKeys = [...grouped.keys()].sort()

  return (
    <PageContainer>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6">
        <Panel padding="none" className="overflow-hidden">
          <PanelHeader>
            <PanelHeading>
              <PanelTitle>Upcoming deadlines</PanelTitle>
              <PanelDescription>Assignments, quizzes, and materials by due date.</PanelDescription>
            </PanelHeading>
          </PanelHeader>

          <PanelBody className="p-0">
            {dayKeys.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 />}
                tone="success"
                title="Nothing due in the next 30 days"
                description="New coursework with due dates will appear here."
              />
            ) : (
              dayKeys.map((dayKey) => {
                const dayItems = grouped.get(dayKey)!
                const firstItem = dayItems[0]
                return (
                  <section key={dayKey} className="border-b border-hairline last:border-b-0">
                    <h2 className="flex items-center gap-2 bg-surface/60 px-4 py-2 type-overline font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {dayLabel(firstItem.dueDate)}
                      <span className="tabular-nums text-muted-foreground/60">{dayItems.length}</span>
                    </h2>
                    <ul className="divide-y divide-hairline">
                      {dayItems.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={`/${orgSlug}/classes/${item.classId}`}
                            className="touch-target focus-ring group flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-surface-sunken sm:gap-3"
                          >
                            <CourseSwatch
                              value={item.classColor}
                              courseKey={item.classId}
                              size="sm"
                              label={`${item.className} course color`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate type-small font-medium text-foreground transition-colors group-hover:text-primary-strong">
                                {item.title}
                              </span>
                              <span className="block truncate type-caption text-muted-foreground">
                                {item.className} · {itemTypeLabel(item.type)}
                                {item.points ? ` · ${item.points} pts` : ""}
                              </span>
                            </span>
                            <span className="shrink-0">
                              {item.isSubmitted ? (
                                <StatusBadge tone="success" dot size="sm">
                                  <span className="hidden sm:inline">Submitted</span>
                                  <span className="inline sm:hidden">✓</span>
                                </StatusBadge>
                              ) : (
                                <StatusBadge tone="neutral" size="sm">
                                  <span className="hidden sm:inline">{format(item.dueDate, "h:mm a")}</span>
                                  <span className="inline tabular-nums sm:hidden">{format(item.dueDate, "h a")}</span>
                                </StatusBadge>
                              )}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })
            )}
          </PanelBody>
        </Panel>

        <aside className="space-y-4 lg:space-y-5" aria-label="Class schedule">
          {userClasses.filter((item) => item.schedule).length > 0 ? (
            <Panel padding="none" className="overflow-hidden">
              <PanelHeader>
                <PanelHeading>
                  <PanelTitle>Class schedule</PanelTitle>
                  <PanelDescription>Recurring meeting times for your classes.</PanelDescription>
                </PanelHeading>
              </PanelHeader>
              <PanelBody className="p-0">
                <ul className="divide-y divide-hairline">
                  {userClasses
                    .filter((item) => item.schedule)
                    .map((item) => (
                      <li key={item.id} className="flex items-center gap-2.5 px-4 py-3 sm:gap-3">
                        <CourseSwatch value={item.color} courseKey={item.id} size="sm" label={`${item.title} course color`} />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <Text variant="small" truncate className="block font-medium">
                            {item.title}
                          </Text>
                          <Text variant="caption" tone="muted" truncate className="block">
                            {item.schedule}
                          </Text>
                        </div>
                      </li>
                    ))}
                </ul>
              </PanelBody>
            </Panel>
          ) : null}

          <Panel padding="none" className="overflow-hidden">
            <PanelHeader>
              <PanelHeading>
                <PanelTitle>Need a deadline moved?</PanelTitle>
                <PanelDescription>Talk to your teacher about due dates in any class.</PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <PanelBody>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/${orgSlug}/messages`}>
                  <CalendarDays aria-hidden="true" />
                  Open messages
                </Link>
              </Button>
            </PanelBody>
          </Panel>
        </aside>
      </div>
    </PageContainer>
  )
}