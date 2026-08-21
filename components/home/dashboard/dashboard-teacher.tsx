"use client"

import Link from "next/link"
import { ArrowRight, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/ui/section"
import { Text } from "@/components/ui/typography"
import { PulseCard } from "@/components/home/pulse-card"
import type { TeacherDashboardViewModel } from "./dashboard-types"
import { DashboardShell, DashboardSection, DashboardGrid } from "./dashboard-shell"
import { DashboardHeader } from "./dashboard-header"
import { DashboardMetricStrip } from "./dashboard-metric-strip"
import { DashboardAttentionQueue } from "./dashboard-attention-queue"
import { DashboardDeadlines } from "./dashboard-deadlines"
import { DashboardClassList } from "./dashboard-class-list"
import { DashboardActivity } from "./dashboard-activity"
import { DashboardAiCue } from "./dashboard-ai-cue"

type DashboardTeacherProps = {
  viewModel: TeacherDashboardViewModel
  userName: string
}

/**
 * Teacher-specific dashboard composition.
 * Prioritizes grading queue, unread student questions, overdue work,
 * students requiring check-in, upcoming classwork, and teaching-focused activity.
 */
export function DashboardTeacher({ viewModel, userName }: DashboardTeacherProps) {
  return (
    <DashboardShell>
      <DashboardHeader header={viewModel.header} userName={userName} />

      {/* Teacher pulse metrics */}
      <DashboardMetricStrip metrics={viewModel.metrics} />

      {/* Primary teaching queue + supporting rail */}
      <DashboardGrid variant="primary-rail">
        {/* Teaching queue (submissions, questions, overdue alerts) */}
        <DashboardAttentionQueue
          role="teacher"
          items={viewModel.queue}
          orgSlug={viewModel.orgSlug}
        />

        {/* Supporting rail: deadlines + AI cue */}
        <div className="space-y-4 sm:space-y-5">
          <DashboardDeadlines
            deadlines={viewModel.deadlines}
            orgSlug={viewModel.orgSlug}
            role="teacher"
          />
          <DashboardAiCue
            role="teacher"
            orgSlug={viewModel.orgSlug}
            queueCount={viewModel.queue.length}
            classCount={viewModel.classes.length}
          />
        </div>
      </DashboardGrid>

      {/* Daily Class Pulse (when available) */}
      {viewModel.pulse && (
        <section className="max-w-full sm:max-w-xl">
          <PulseCard orgSlug={viewModel.orgSlug} facts={viewModel.pulse} />
        </section>
      )}

      {/* Student check-in section */}
      {viewModel.checkIns.length > 0 && (
        <TeacherCheckInSection checkIns={viewModel.checkIns} orgSlug={viewModel.orgSlug} />
      )}

      {/* Classes preview */}
      <DashboardClassList
        classes={viewModel.classes}
        orgSlug={viewModel.orgSlug}
        role="teacher"
      />

      {/* Recent activity */}
      <DashboardActivity
        activity={viewModel.activity}
        orgSlug={viewModel.orgSlug}
        role="teacher"
      />
    </DashboardShell>
  )
}

type TeacherCheckInSectionProps = {
  checkIns: TeacherDashboardViewModel["checkIns"]
  orgSlug: string
}

/**
 * Students requiring check-in based on low recent activity.
 * Shows students with no activity in the last 7 days.
 */
function TeacherCheckInSection({ checkIns, orgSlug }: TeacherCheckInSectionProps) {
  return (
    <DashboardSection>
      <SectionHeader
        title="Students to check in with"
        description="No class activity in the last seven days."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checkIns.map((student) => (
          <Link
            key={`${student.classId}-${student.userId}`}
            href={`/${orgSlug}/classes/${student.classId}?tab=people`}
            className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 rounded-[var(--radius-container)] border border-hairline bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline/80 hover:bg-surface-subtle/60 hover:shadow-2xs"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-subtle font-semibold text-foreground">
              {student.studentName.slice(0, 1).toUpperCase()}
            </div>
            <span className="min-w-0 flex-1 space-y-0.5">
              <Text as="span" variant="h4" truncate className="block font-semibold text-foreground group-hover:text-primary-text">
                {student.studentName}
              </Text>
              <Text as="span" variant="caption" tone="muted" truncate className="block">
                {student.className}
              </Text>
            </span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </DashboardSection>
  )
}
