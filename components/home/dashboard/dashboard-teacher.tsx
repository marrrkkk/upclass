"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Copy, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SectionHeader } from "@/components/ui/section"
import { Spinner } from "@/components/ui/spinner"
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
 * Shows students with no activity in the last 7 days, plus AI-drafted
 * outreach the teacher can copy and send.
 */
function TeacherCheckInSection({ checkIns, orgSlug }: TeacherCheckInSectionProps) {
  const [draftFor, setDraftFor] = useState<TeacherDashboardViewModel["checkIns"][number] | null>(null)

  return (
    <DashboardSection>
      <SectionHeader
        title="Students to check in with"
        description="No class activity in the last seven days."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checkIns.map((student) => (
          <div
            key={`${student.classId}-${student.userId}`}
            className="group flex min-w-0 items-center gap-3.5 rounded-[var(--radius-container)] border border-hairline bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline/80 hover:bg-surface-subtle/60 hover:shadow-2xs"
          >
            <Link
              href={`/${orgSlug}/classes/${student.classId}?tab=people`}
              className="touch-target focus-ring flex min-w-0 flex-1 items-center gap-3.5"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraftFor(student)}
              title={`Draft an outreach message for ${student.studentName}`}
            >
              <Sparkles aria-hidden="true" />
              Draft
            </Button>
          </div>
        ))}
      </div>

      <OutreachDraftDialog
        target={draftFor}
        onClose={() => setDraftFor(null)}
      />
    </DashboardSection>
  )
}

function OutreachDraftDialog({
  target,
  onClose,
}: {
  target: TeacherDashboardViewModel["checkIns"][number] | null
  onClose: () => void
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const isOpen = Boolean(target)

  async function generate() {
    if (!target || pending) return
    setError(null)
    setPending(true)
    try {
      const response = await fetch("/api/ai/outreach-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: target.userId, classId: target.classId }),
      })
      const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null
      if (!response.ok || !data?.message) {
        setError(data?.error ?? "The draft could not be generated.")
        return
      }
      setMessage(data.message)
    } catch {
      setError("You appear to be offline.")
    } finally {
      setPending(false)
    }
  }

  function handleClose(nextOpen: boolean) {
    if (nextOpen) return
    setMessage(null)
    setError(null)
    setCopied(false)
    onClose()
  }

  async function copyDraft() {
    if (!message) return
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      // Clipboard unavailable — the message stays selectable in the dialog.
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Draft check-in message</DialogTitle>
          <DialogDescription>
            {target ? `A gentle outreach draft for ${target.studentName} (${target.className}).` : ""}
          </DialogDescription>
        </DialogHeader>

        {!message && !pending ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The assistant writes a draft from activity and submission context. You review and send it yourself.
            </p>
            <Button type="button" onClick={generate}>
              <Sparkles data-icon="inline-start" />
              Write draft
            </Button>
          </div>
        ) : null}

        {pending ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground" role="status">
            <Spinner className="size-4" aria-hidden="true" />
            Writing a draft…
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-hairline bg-surface-sunken p-3.5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Close
          </Button>
          {message ? (
            <Button variant="outline" onClick={copyDraft}>
              {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              {copied ? "Copied" : "Copy draft"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
