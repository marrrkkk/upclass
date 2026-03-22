"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ReviewQueueItem = {
  submissionId: string
  classId: string
  className: string
  classColor: string
  classworkTitle: string
  studentName: string
  submittedAt: string | null
  attachmentCount: number
}

type WeeklySummary = {
  submissions: number
  graded: number
  unreadQuestions: number
  overdue: number
}

type LowParticipationItem = {
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
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Review Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everything submitted has been reviewed.</p>
          ) : (
            reviewQueue.map((item) => (
              <Link
                key={item.submissionId}
                href={`/classes/${item.classId}?tab=classwork`}
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{item.classworkTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.studentName} in {item.className}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    style={{ borderColor: item.classColor, color: item.classColor }}
                  >
                    {item.attachmentCount} attachments
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {formatRelativeDate(item.submittedAt)}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/20 p-4">
              <p className="text-2xl font-bold">{weeklySummary.submissions}</p>
              <p className="text-sm text-muted-foreground">Submissions</p>
            </div>
            <div className="rounded-lg bg-muted/20 p-4">
              <p className="text-2xl font-bold">{weeklySummary.graded}</p>
              <p className="text-sm text-muted-foreground">Graded</p>
            </div>
            <div className="rounded-lg bg-muted/20 p-4">
              <p className="text-2xl font-bold">{weeklySummary.unreadQuestions}</p>
              <p className="text-sm text-muted-foreground">Unread questions</p>
            </div>
            <div className="rounded-lg bg-muted/20 p-4">
              <p className="text-2xl font-bold">{weeklySummary.overdue}</p>
              <p className="text-sm text-muted-foreground">Overdue items</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Participation Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowParticipation.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low-participation alerts this week.</p>
            ) : (
              lowParticipation.map((entry) => (
                <Link
                  key={`${entry.classId}-${entry.userId}`}
                  href={`/classes/${entry.classId}?tab=people`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <p className="font-medium">{entry.studentName}</p>
                  <p className="text-sm text-muted-foreground">{entry.className}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last active {formatRelativeDate(entry.lastActiveAt)}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
