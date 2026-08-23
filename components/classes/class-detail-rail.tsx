"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, ClipboardList, GraduationCap, KeyRound, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Mono, Text } from "@/components/ui/typography"
import {
  Panel,
  PanelActions,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { BackgroundCache } from "@/lib/background-cache"
import type { ClassDetailTab } from "@/lib/classes/class-detail-tabs"
import type { ClassRailData } from "@/types/classes"

type ClassDetailRailProps = {
  classId: string
  classCode: string
  userRole: "teacher" | "student" | null
  railData: ClassRailData
}

function formatSubmitted(dateString: string | null) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatDue(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function gradeTone(status: ClassRailGradeStatus): "success" | "info" | "warning" {
  if (status === "graded") return "success"
  if (status === "submitted") return "info"
  return "warning"
}

type ClassRailGradeStatus = ClassRailData["myGrades"][number]["status"]

export function ClassDetailRail({
  classId,
  classCode,
  userRole,
  railData,
}: ClassDetailRailProps) {
  const router = useRouter()
  const organizationPath = useOrganizationPath()
  const [cachedRail, setCachedRail] = useState<ClassRailData | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || navigator.onLine) return

    let cancelled = false

    const hydrate = async () => {
      try {
        const cache = BackgroundCache.getInstance()
        const cached = await cache.getCachedClassDetail(classId)
        if (!cancelled && cached?.rail) {
          setCachedRail(cached.rail as ClassRailData)
        }
      } catch (error) {
        console.debug("Failed to hydrate cached rail:", error)
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [classId])

  const effectiveRail = cachedRail ?? railData

  const goToTab = (tab: ClassDetailTab, create = false) => {
    const params = new URLSearchParams()
    if (tab !== "stream") params.set("tab", tab)
    if (create) params.set("create", "1")
    const query = params.toString()
    router.push(organizationPath(`/classes/${classId}${query ? `?${query}` : ""}`))
  }

  if (userRole === "teacher") {
    return (
      <div className="flex flex-col gap-5">
        <Panel padding="none" className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
          <PanelHeader className="pb-3">
            <PanelHeading>
              <PanelTitle>Needs grading</PanelTitle>
              <PanelDescription>
                {effectiveRail.gradingCounts.classwork} classwork · {effectiveRail.gradingCounts.quizzes} quizzes
              </PanelDescription>
            </PanelHeading>
          </PanelHeader>
          <PanelBody className="space-y-2 pt-0">
            {effectiveRail.needsGrading.length === 0 ? (
              <Text variant="caption" tone="muted" className="block pt-1 pb-2">
                Nothing waiting for review.
              </Text>
            ) : (
              <div className="divide-y divide-hairline">
                {effectiveRail.needsGrading.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="row-interactive focus-ring flex w-full items-center gap-2.5 py-2.5 text-left rounded-lg px-2 -mx-2 hover:bg-surface-raised/50"
                    onClick={() => goToTab("gradebook")}
                  >
                    <EntityAvatar name={item.studentName} colorKey={item.studentId} size="xs" />
                    <div className="min-w-0 flex-1">
                      <Text variant="small" truncate className="font-semibold">{item.studentName}</Text>
                      <Text variant="caption" tone="muted" truncate>
                        {item.title}
                        {item.submittedAt ? ` · ${formatSubmitted(item.submittedAt)}` : ""}
                      </Text>
                    </div>
                    <StatusBadge tone="warning">
                      {item.kind === "classwork" ? "Needs grading" : "Pending review"}
                    </StatusBadge>
                  </button>
                ))}
              </div>
            )}
          </PanelBody>
          <div className="border-t border-hairline/70 px-4 py-2.5 bg-surface-subtle/30">
            <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 rounded-lg text-xs font-semibold">
              <Link href={organizationPath(`/classes/${classId}?tab=gradebook`)}>
                <GraduationCap className="size-3.5" aria-hidden="true" />
                Open gradebook
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel padding="none" className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
          <PanelHeader className="pb-3">
            <PanelHeading>
              <PanelTitle className="gap-2">
                <KeyRound className="size-4 text-primary" aria-hidden="true" />
                Join code
              </PanelTitle>
            </PanelHeading>
          </PanelHeader>
          <PanelBody className="flex items-center justify-between gap-3 pt-0 pb-4">
            <div className="flex items-center gap-2 rounded-lg border border-hairline/80 bg-surface-raised/80 px-3 py-1.5 font-mono text-sm font-bold text-foreground">
              <Mono className="numeric-tabular">{classCode}</Mono>
            </div>
            <CopyButton value={classCode} label="Join code" size="sm" className="rounded-lg" />
          </PanelBody>
        </Panel>

        <Panel padding="none" className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
          <PanelHeader className="pb-3">
            <PanelHeading>
              <PanelTitle>Quick create</PanelTitle>
            </PanelHeading>
          </PanelHeader>
          <PanelBody className="grid gap-2 pt-0 pb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 justify-start gap-2.5 rounded-lg border-hairline/80 bg-surface-raised/50 text-xs font-semibold hover:bg-surface-raised"
              onClick={() => goToTab("stream", true)}
            >
              <MessageSquare className="size-3.5 text-primary" aria-hidden="true" />
              New announcement
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 justify-start gap-2.5 rounded-lg border-hairline/80 bg-surface-raised/50 text-xs font-semibold hover:bg-surface-raised"
              onClick={() => goToTab("classwork", true)}
            >
              <BookOpen className="size-3.5 text-info" aria-hidden="true" />
              New classwork
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 justify-start gap-2.5 rounded-lg border-hairline/80 bg-surface-raised/50 text-xs font-semibold hover:bg-surface-raised"
              onClick={() => goToTab("quizzes", true)}
            >
              <ClipboardList className="size-3.5 text-warning" aria-hidden="true" />
              New quiz
            </Button>
          </PanelBody>
        </Panel>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel padding="none" className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
        <PanelHeader className="pb-3">
          <PanelHeading>
            <PanelTitle>My grades</PanelTitle>
            <PanelDescription>Recent classwork and quiz results.</PanelDescription>
          </PanelHeading>
        </PanelHeader>
        <PanelBody className="space-y-2 pt-0">
          {effectiveRail.myGrades.length === 0 ? (
            <Text variant="caption" tone="muted" className="block pt-1 pb-2">
              No grades yet.
            </Text>
          ) : (
            <div className="divide-y divide-hairline">
              {effectiveRail.myGrades.slice(0, 6).map((grade) => (
                <div key={grade.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Text variant="small" truncate className="font-semibold">{grade.title}</Text>
                  {grade.status === "graded" ? (
                    <StatusBadge tone="success" className="numeric-tabular">
                      {grade.grade} / {grade.total}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone={gradeTone(grade.status)}>
                      {grade.status === "submitted" ? "Submitted" : grade.status === "draft" ? "Draft" : "Pending review"}
                    </StatusBadge>
                  )}
                </div>
              ))}
            </div>
          )}
        </PanelBody>
        <div className="border-t border-hairline/70 px-4 py-2.5 bg-surface-subtle/30">
          <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 rounded-lg text-xs font-semibold">
            <Link href={organizationPath(`/classes/${classId}?tab=quizzes`)}>
              View my quiz attempts
            </Link>
          </Button>
        </div>
      </Panel>

      <Panel padding="none" className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
        <PanelHeader className="pb-3">
          <PanelHeading>
            <PanelTitle>Upcoming due</PanelTitle>
            <PanelDescription>Work still open for submission.</PanelDescription>
          </PanelHeading>
          <PanelActions>
            <StatusBadge tone="neutral" className="numeric-tabular">
              {effectiveRail.upcomingDue.length}
            </StatusBadge>
          </PanelActions>
        </PanelHeader>
        <PanelBody className="space-y-2 pt-0 pb-4">
          {effectiveRail.upcomingDue.length === 0 ? (
            <Text variant="caption" tone="muted" className="block pt-1 pb-2">
              Nothing due. You&apos;re all caught up.
            </Text>
          ) : (
            <div className="divide-y divide-hairline">
              {effectiveRail.upcomingDue.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Text variant="small" truncate className="font-semibold">{item.title}</Text>
                    <Text variant="caption" tone="muted" className="capitalize">{item.kind}</Text>
                  </div>
                  <StatusBadge tone="warning" className="shrink-0">
                    {formatDue(item.dueDate)}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>
    </div>
  )
}
