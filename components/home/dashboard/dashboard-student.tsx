"use client"

import Link from "next/link"
import { ArrowRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { Panel, PanelBody } from "@/components/ui/panel"
import { SectionHeader } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { PulseCard } from "@/components/home/pulse-card"
import type { StudentDashboardViewModel } from "./dashboard-types"
import { DashboardShell, DashboardSection, DashboardGrid } from "./dashboard-shell"
import { DashboardHeader } from "./dashboard-header"
import { DashboardNextAction } from "./dashboard-next-action"
import { DashboardAttentionQueue } from "./dashboard-attention-queue"
import { DashboardClassList } from "./dashboard-class-list"
import { DashboardActivity } from "./dashboard-activity"
import { DashboardAiCue } from "./dashboard-ai-cue"
import { DashboardEmptyState } from "./dashboard-empty-state"
import { formatDueDate, formatRelativeTime } from "./dashboard-formatters"

type DashboardStudentProps = {
  viewModel: StudentDashboardViewModel
  userName: string
}

/**
 * Student-specific dashboard composition.
 * Prioritizes next unfinished assignment, due work, recently graded feedback,
 * unread messages, announcements, and learning-focused activity.
 */
export function DashboardStudent({ viewModel, userName }: DashboardStudentProps) {
  return (
    <DashboardShell>
      <DashboardHeader header={viewModel.header} userName={userName} />

      {/* Next learning action (continue where you left off) */}
      <DashboardNextAction nextAction={viewModel.nextAction} orgSlug={viewModel.orgSlug} />

      {/* Student attention queue + supporting rail */}
      <DashboardGrid variant="primary-rail">
        {/* Attention queue (due soon, graded, messages, announcements) */}
        <DashboardAttentionQueue
          role="student"
          items={viewModel.attention}
          orgSlug={viewModel.orgSlug}
        />

        {/* Supporting rail: timeline + AI cue */}
        <div className="space-y-4 sm:space-y-5">
          <StudentTimeline timeline={viewModel.timeline} orgSlug={viewModel.orgSlug} />
          <DashboardAiCue
            role="student"
            orgSlug={viewModel.orgSlug}
            queueCount={viewModel.attention.length}
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

      {/* Feedback and messages */}
      {(viewModel.feedback.length > 0 || viewModel.messages.length > 0) && (
        <StudentFeedbackAndMessages
          feedback={viewModel.feedback}
          messages={viewModel.messages}
          orgSlug={viewModel.orgSlug}
        />
      )}

      {/* Classes preview */}
      <DashboardClassList
        classes={viewModel.classes}
        orgSlug={viewModel.orgSlug}
        role="student"
      />

      {/* Recent activity */}
      <DashboardActivity
        activity={viewModel.activity}
        orgSlug={viewModel.orgSlug}
        role="student"
      />
    </DashboardShell>
  )
}

type StudentTimelineProps = {
  timeline: StudentDashboardViewModel["timeline"]
  orgSlug: string
}

/**
 * Compact timeline/runway of upcoming and recently completed work.
 * Grouped by: today, this week, later, completed.
 */
function StudentTimeline({ timeline, orgSlug }: StudentTimelineProps) {
  const buckets = {
    today: timeline.filter((item) => item.bucket === "today"),
    this_week: timeline.filter((item) => item.bucket === "this_week"),
    later: timeline.filter((item) => item.bucket === "later"),
    completed: timeline.filter((item) => item.bucket === "completed"),
  }

  const visibleBuckets = [
    { key: "today", label: "Due today", items: buckets.today },
    { key: "this_week", label: "Due this week", items: buckets.this_week },
    { key: "later", label: "Later", items: buckets.later },
    { key: "completed", label: "Recently completed", items: buckets.completed },
  ].filter((bucket) => bucket.items.length > 0)

  return (
    <Panel>
      <PanelBody className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-4 text-primary-text" />
          <Text variant="h4">Learning runway</Text>
        </div>
        {visibleBuckets.length === 0 ? (
          <DashboardEmptyState
            title="No upcoming work"
            description="New assignments will appear here."
            compact
          />
        ) : (
          <div className="space-y-3">
            {visibleBuckets.map((bucket) => (
              <div key={bucket.key} className="space-y-1.5">
                <Text variant="caption" tone="muted" className="font-medium uppercase">
                  {bucket.label}
                </Text>
                <ul className="space-y-1.5">
                  {bucket.items.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/${orgSlug}/classes/${item.classId}?tab=classwork`}
                        className="focus-ring group flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover"
                      >
                        <CourseSwatch
                          value={item.classColor}
                          courseKey={item.classId}
                          size="sm"
                        />
                        <Text
                          as="span"
                          variant="small"
                          truncate
                          className="min-w-0 flex-1 group-hover:text-primary-text"
                        >
                          {item.title}
                        </Text>
                        {item.isGraded && (
                          <StatusBadge tone="success" size="sm">
                            Graded
                          </StatusBadge>
                        )}
                        {!item.isGraded && item.isSubmitted && (
                          <StatusBadge tone="info" size="sm">
                            Submitted
                          </StatusBadge>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

type StudentFeedbackAndMessagesProps = {
  feedback: StudentDashboardViewModel["feedback"]
  messages: StudentDashboardViewModel["messages"]
  orgSlug: string
}

/**
 * Combined feedback and messages section.
 * Shows recently graded work with feedback and unread messages.
 */
function StudentFeedbackAndMessages({
  feedback,
  messages,
  orgSlug,
}: StudentFeedbackAndMessagesProps) {
  const hasFeedback = feedback.length > 0
  const hasMessages = messages.length > 0

  return (
    <DashboardSection>
      <SectionHeader
        title="Feedback & messages"
        description="Recent grades and communications."
      />
      <DashboardGrid variant="equal">
        {/* Recently graded feedback */}
        {hasFeedback && (
          <Panel padding="none" className="overflow-hidden">
            <div className="border-b border-hairline px-4 py-3 sm:px-5">
              <Text variant="h4">Recent feedback</Text>
            </div>
            <ul className="divide-y divide-hairline">
              {feedback.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${orgSlug}/classes/${item.classId}?tab=classwork`}
                    className="touch-target focus-ring group flex min-w-0 items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover sm:px-5"
                  >
                    <CourseSwatch
                      value={item.classColor}
                      courseKey={item.classId}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <Text as="span" variant="h4" truncate className="block">
                        {item.classworkTitle}
                      </Text>
                      <Text as="span" variant="small" tone="muted" truncate className="block">
                        {item.className}
                      </Text>
                      <div className="flex items-baseline gap-2">
                        <Text as="span" variant="small" className="font-medium text-success-text">
                          {item.grade}
                        </Text>
                        {item.points && (
                          <Text as="span" variant="caption" tone="muted">
                            out of {item.points}
                          </Text>
                        )}
                        <Text as="span" variant="caption" tone="muted">
                          · {formatRelativeTime(item.gradedAt)}
                        </Text>
                      </div>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-foreground-muted"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {/* Unread messages */}
        {hasMessages && (
          <Panel padding="none" className="overflow-hidden">
            <div className="border-b border-hairline px-4 py-3 sm:px-5">
              <Text variant="h4">Messages</Text>
            </div>
            <ul className="divide-y divide-hairline">
              {messages.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${orgSlug}/messages`}
                    className="touch-target focus-ring group flex min-w-0 items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover sm:px-5"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card">
                      <Text as="span" variant="small" className="font-medium">
                        {item.senderName.slice(0, 1).toUpperCase()}
                      </Text>
                    </div>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <Text as="span" variant="h4" truncate className="block">
                        {item.senderName}
                      </Text>
                      <Text as="span" variant="small" tone="muted" truncate className="block">
                        {item.preview}
                      </Text>
                      <Text as="span" variant="caption" tone="muted">
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </span>
                    {!item.isRead && (
                      <div className="size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </DashboardGrid>
    </DashboardSection>
  )
}
