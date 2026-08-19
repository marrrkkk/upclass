"use client"

import Link from "next/link"
import { ArrowRight, Building2, CalendarDays, CheckCircle2 } from "lucide-react"

import { ActivityLogList } from "@/components/activity/activity-log-list"
import { HomeActionQueue, type ActionQueueItem } from "@/components/home/home-action-queue"
import { HomeAiCue } from "@/components/home/home-ai-cue"
import { PulseCard } from "@/components/home/pulse-card"
import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel, PanelActions, PanelBody, PanelHeader, PanelHeading, PanelTitle } from "@/components/ui/panel"
import { SectionHeader } from "@/components/ui/section"
import { Text } from "@/components/ui/typography"
import type { ActivityLogItem } from "@/lib/activity-ui"
import type { PulseFacts } from "@/lib/ai/pulse/facts"

export type HomeRole = "teacher" | "student" | "admin"

export type HomeClass = {
  id: string
  title: string
  description?: string | null
  color: string | null
  category?: string | null
  memberCount: number
  role: "teacher" | "student"
}

export type HomeQueueItem = ActionQueueItem

export type HomeDeadline = {
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

export type HomeAdminSummary = {
  members: number
  classes: number
  pendingInvitations: number
}

type HomeDashboardProps = {
  greeting: string
  userName: string
  role: HomeRole
  orgSlug: string
  dateLabel: string
  classes: HomeClass[]
  queueItems: HomeQueueItem[]
  deadlines: HomeDeadline[]
  activity: ActivityLogItem[]
  teacherAnalytics?: {
    weeklySummary: { graded: number; unreadQuestions: number; overdue: number }
    lowParticipation: Array<{ userId: string; studentName: string; classId: string; className: string; lastActiveAt: string | null }>
  } | null
  adminSummary?: HomeAdminSummary | null
  /** Aggregated Daily Class Pulse facts (server-side; null when disabled). */
  pulseFacts?: PulseFacts | null
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there"
}

function deadlineLabel(deadline: HomeDeadline) {
  const date = new Date(deadline.dueDate)
  if (Number.isNaN(date.getTime())) return "No due date"
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)
}

function DeadlineList({ deadlines, orgSlug }: { deadlines: HomeDeadline[]; orgSlug: string }) {
  const visible = deadlines
    .filter((item) => !item.isSubmitted)
    .slice(0, 4)

  return (
    <Panel padding="none" className="overflow-hidden">
      <PanelHeader>
        <PanelHeading>
          <PanelTitle><CalendarDays aria-hidden="true" className="size-4 text-primary-text" />Upcoming</PanelTitle>
        </PanelHeading>
        <PanelActions>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${orgSlug}/calendar`}>Calendar <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </PanelActions>
      </PanelHeader>
      <PanelBody className="p-0">
        {visible.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-4 sm:py-5">
            <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success-text" />
            <div><Text variant="h4">Nothing due soon</Text><Text variant="caption" tone="muted">New coursework with a deadline will appear here.</Text></div>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {visible.map((deadline) => (
              <li key={deadline.id}>
                <Link href={`/${orgSlug}/classes/${deadline.classId}?tab=classwork`} className="touch-target focus-ring group grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 transition-colors hover:bg-surface-hover sm:grid-cols-[3.5rem_minmax(0,1fr)]">
                  <span className="type-caption font-medium text-foreground-secondary">{deadlineLabel(deadline)}</span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2"><CourseSwatch value={deadline.classColor} courseKey={deadline.classId} size="sm" /><Text as="span" variant="h4" truncate>{deadline.title}</Text></span>
                    <Text variant="caption" tone="muted" truncate>{deadline.className} · {deadline.type === "quiz" ? "Quiz" : "Assignment"}</Text>
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

function ClassesList({ classes, orgSlug }: { classes: HomeClass[]; orgSlug: string }) {
  return (
    <section className="space-y-3 sm:space-y-4">
      <SectionHeader title="Your classes" description="The workspaces you return to most." actions={<Button variant="ghost" size="sm" asChild><Link href={`/${orgSlug}/classes`}>All classes <ArrowRight aria-hidden="true" /></Link></Button>} />
      <Panel padding="none" className="overflow-hidden">
        {classes.length === 0 ? (
          <EmptyState icon={<Building2 />} title="No classes yet" description="Create or join a class to start working with your classroom." action={<Button asChild><Link href={`/${orgSlug}/classes`}>Open classes</Link></Button>} />
        ) : (
          <ul className="divide-y divide-hairline">
            {classes.slice(0, 6).map((classItem) => (
              <li key={classItem.id}>
                <Link href={`/${orgSlug}/classes/${classItem.id}`} className="touch-target focus-ring group flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover sm:px-5 sm:py-3.5">
                  <CourseSwatch value={classItem.color} courseKey={classItem.id} size="md" />
                  <span className="min-w-0 flex-1"><Text as="span" variant="h3" truncate className="block group-hover:text-primary-text">{classItem.title}</Text><Text as="span" variant="caption" tone="muted" truncate className="block">{classItem.category || classItem.description || (classItem.role === "teacher" ? "Teaching" : "Enrolled")} · {classItem.memberCount} students</Text></span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </section>
  )
}

function AdminHome({ summary, orgSlug }: { summary: HomeAdminSummary | null | undefined; orgSlug: string }) {
  const items = [
    { label: "People", value: summary?.members ?? 0 },
    { label: "Classes", value: summary?.classes ?? 0 },
    { label: "Pending invites", value: summary?.pendingInvitations ?? 0 },
  ]
  return (
    <section className="space-y-3">
      <SectionHeader title="Organization overview" description="The operational work that needs your attention." actions={<Button size="sm" asChild><Link href={`/${orgSlug}/admin`}>Open administration</Link></Button>} />
      <Panel className="p-0">
        <dl className="grid divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {items.map((item) => <div key={item.label} className="px-4 py-4 sm:px-5"><dt className="type-caption text-muted-foreground">{item.label}</dt><dd className="mt-1 type-h2 numeric-tabular">{item.value}</dd></div>)}
        </dl>
      </Panel>
    </section>
  )
}

export function HomeDashboard({ greeting, userName, role, orgSlug, dateLabel, classes, queueItems, deadlines, activity, teacherAnalytics, adminSummary, pulseFacts }: HomeDashboardProps) {
  const isTeacher = role === "teacher"
  const isAdmin = role === "admin"
  const action = isAdmin
    ? { label: "Open administration", href: `/${orgSlug}/admin` }
    : isTeacher && queueItems.length > 0
      ? { label: "Review submissions", href: `/${orgSlug}/classes` }
      : { label: "Open my classes", href: `/${orgSlug}/classes` }
  const summaryItems = isAdmin
    ? [{ label: "People", value: adminSummary?.members ?? 0 }, { label: "Classes", value: adminSummary?.classes ?? 0 }, { label: "Pending invites", value: adminSummary?.pendingInvitations ?? 0 }]
    : [
        { label: "Classes", value: classes.length },
        { label: isTeacher ? "Pending reviews" : "Needs attention", value: queueItems.length },
        ...(isTeacher && teacherAnalytics?.lowParticipation.length ? [{ label: "Students to check in", value: teacherAnalytics.lowParticipation.length }] : []),
      ]

  return (
    <div className="space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10">
      <header className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:pb-6">
        <div className="min-w-0 space-y-1.5"><Text variant="caption" tone="muted">{dateLabel}</Text><Text as="h1" variant="display" className="text-balance">{greeting}, {firstName(userName)}</Text><Text variant="body" tone="muted" className="max-w-2xl text-pretty">{isAdmin ? "Here is the current state of your organization." : "Here is what needs your attention across your classes today."}</Text></div>
        <Button asChild className="w-full sm:w-auto"><Link href={action.href}>{action.label}<ArrowRight aria-hidden="true" /></Link></Button>
      </header>

      {summaryItems.length > 0 ? <dl className="flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-7">{summaryItems.filter((item) => item.value > 0).map((item) => <div key={item.label} className="flex items-baseline gap-2"><dd className="type-h2 numeric-tabular">{item.value}</dd><dt className="type-caption text-muted-foreground">{item.label}</dt></div>)}</dl> : null}

      {isAdmin ? <AdminHome summary={adminSummary} orgSlug={orgSlug} /> : <section className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]"><HomeActionQueue items={queueItems} role={isTeacher ? "teacher" : "student"} summary={teacherAnalytics?.weeklySummary} /><div className="space-y-4 sm:space-y-5"><DeadlineList deadlines={deadlines} orgSlug={orgSlug} /><HomeAiCue queueItems={queueItems} role={isTeacher ? "teacher" : "student"} totalClasses={classes.length} /></div></section>}

      {!isAdmin && pulseFacts ? (
        <section className="max-w-full sm:max-w-xl">
          <PulseCard orgSlug={orgSlug} facts={pulseFacts} />
        </section>
      ) : null}

      {!isAdmin ? <ClassesList classes={classes} orgSlug={orgSlug} /> : null}

      {isTeacher && teacherAnalytics?.lowParticipation.length ? <section className="space-y-3 sm:space-y-4"><SectionHeader title="Students to check in with" description="No class activity in the last seven days." /><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{teacherAnalytics.lowParticipation.map((entry) => <Link key={`${entry.classId}-${entry.userId}`} href={`/${orgSlug}/classes/${entry.classId}?tab=people`} className="touch-target focus-ring flex min-w-0 items-center gap-3 rounded-[var(--radius-container)] bg-surface-subtle px-4 py-3 transition-colors hover:bg-surface-hover"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card type-small font-medium">{entry.studentName.slice(0, 1)}</span><span className="min-w-0 flex-1"><Text as="span" variant="h4" truncate className="block">{entry.studentName}</Text><Text as="span" variant="caption" tone="muted" truncate className="block">{entry.className}</Text></span><ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted" /></Link>)}</div></section> : null}

      <section className="space-y-3 sm:space-y-4"><SectionHeader title="Recent activity" description="Latest work from your classroom." actions={!isAdmin ? <Button variant="ghost" size="sm" asChild><Link href={`/${orgSlug}/activity`}>View all <ArrowRight aria-hidden="true" /></Link></Button> : null} /><Panel padding="none"><PanelBody><ActivityLogList items={activity} emptyTitle="No recent activity" emptyDescription="Class activity will appear here as people work." /></PanelBody></Panel></section>
    </div>
  )
}
