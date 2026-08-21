"use client"

import Link from "next/link"
import { Users } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import {
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { SectionHeader } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { useOrganizationPath } from "@/hooks/use-organization-path"

export type ReviewQueueItem = {
  submissionId: string
  classId: string
  className: string
  classColor: string | null
  classworkTitle: string
  studentName: string
  submittedAt: string | null
  attachmentCount: number
}

export type WeeklySummary = {
  submissions: number
  graded: number
  unreadQuestions: number
  overdue: number
}

export type LowParticipationItem = {
  userId: string
  studentName: string
  classId: string
  className: string
  lastActiveAt: string | null
}

type TeacherAnalyticsPanelProps = {
  lowParticipation: LowParticipationItem[]
  reviewQueue: ReviewQueueItem[]
  weeklySummary: WeeklySummary
}

function formatRelativeDate(value: string | null) {
  if (!value) return "No recent activity"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No recent activity"

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function TeacherAnalyticsPanel({
  lowParticipation,
  reviewQueue,
  weeklySummary,
}: TeacherAnalyticsPanelProps) {
  const organizationPath = useOrganizationPath()

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Teacher attention"
        description={`${weeklySummary.graded} graded and ${weeklySummary.submissions} submissions updated this week. ${reviewQueue.length} ${reviewQueue.length === 1 ? "item is" : "items are"} currently ready for review above.`}
      />

      <Panel padding="none" variant="panel" className="overflow-hidden">
        <PanelHeader>
          <PanelHeading>
            <PanelTitle>Students to check in with</PanelTitle>
            <PanelDescription>Students without activity in the last seven days.</PanelDescription>
          </PanelHeading>
        </PanelHeader>

        <PanelBody className="p-0">
          {lowParticipation.length === 0 ? (
            <EmptyState
              icon={<Users />}
              tone="success"
              title="Participation looks current"
              description="No low-participation alerts this week."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {lowParticipation.map((entry) => (
                <li key={`${entry.classId}-${entry.userId}`}>
                  <Link
                    href={organizationPath(`/classes/${entry.classId}?tab=people`)}
                    className="row-interactive focus-ring flex items-center gap-3 px-5 py-4"
                  >
                    <EntityAvatar name={entry.studentName} colorKey={entry.userId} size="md" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Text variant="h4" truncate>
                        {entry.studentName}
                      </Text>
                      <Text variant="caption" tone="muted" truncate>
                        {entry.className} Â· Last active {formatRelativeDate(entry.lastActiveAt)}
                      </Text>
                    </div>
                    <StatusBadge tone="warning" dot>
                      Check in
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </section>
  )
}
