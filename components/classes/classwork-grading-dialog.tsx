"use client"

import { useState } from "react"
import { File, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Field, FieldLabel, FieldRow } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import type { ClassworkData, SubmissionData } from "@/types/classes"

type ClassworkGradingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: SubmissionData
  item: ClassworkData
  error: string | null
  pending: boolean
  onGrade: (submissionId: string, formData: FormData) => void
}

function formatDate(dateString: string | null) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Shared grading surface for a single classwork submission. Controlled by the
 * caller; used by classwork cards, the review rail, and the gradebook.
 */
export function ClassworkGradingDialog({
  open,
  onOpenChange,
  submission,
  item,
  error,
  pending,
  onGrade,
}: ClassworkGradingDialogProps) {
  // Controlled so the AI assist can fill drafts the teacher edits before
  // saving; the form still posts grade/feedback through FormData. The parent
  // unmounts this dialog between opens, so lazy initializers are fresh.
  const [grade, setGrade] = useState(submission.grade ?? "")
  const [feedback, setFeedback] = useState(submission.feedback ?? "")
  const [assistPending, setAssistPending] = useState(false)
  const [assistError, setAssistError] = useState<string | null>(null)

  async function draftWithAi() {
    setAssistError(null)
    setAssistPending(true)
    try {
      const response = await fetch("/api/ai/grading/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id }),
      })
      const data = (await response.json().catch(() => null)) as
        | { grade?: number; feedback?: string; error?: string }
        | null
      if (!response.ok || !data) {
        setAssistError(data?.error ?? "The draft could not be generated.")
        return
      }
      if (typeof data.grade === "number") setGrade(String(data.grade))
      if (data.feedback) setFeedback(data.feedback)
    } catch {
      setAssistError("You appear to be offline.")
    } finally {
      setAssistPending(false)
    }
  }

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-3">
          <EntityAvatar
            name={submission.student.name}
            image={submission.student.image}
            colorKey={submission.student.id}
            size="sm"
          />
          <span className="min-w-0">
            <span className="block type-h3">Review submission</span>
            <span className="block truncate type-small font-normal text-muted-foreground">
              {item.title} · {submission.student.name}
            </span>
          </span>
        </span>
      }
      desktopClassName="sm:max-w-[44rem]"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="grading-form" isLoading={pending} disabled={pending}>
            Save grade
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="divide-y divide-hairline rounded-lg border border-hairline">
          <div className="px-3 py-2.5">
            <Text variant="caption" tone="muted" className="mb-2 block">
              Latest submission
            </Text>
            {submission.content ? (
              <Text className="whitespace-pre-wrap leading-relaxed">{submission.content}</Text>
            ) : (
              <Text variant="small" tone="muted">No text content submitted.</Text>
            )}
          </div>

          {submission.attachments.length > 0 ? (
            <div className="space-y-2 px-3 py-2.5">
              {submission.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="row-interactive focus-ring flex items-center gap-2 rounded-md border border-hairline bg-surface-sunken p-2 type-small"
                >
                  <File className="size-4" aria-hidden="true" />
                  <span className="font-medium">{attachment.fileName}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {submission.revisions.length > 0 ? (
          <div>
            <Text variant="caption" tone="muted" className="mb-2 block">
              Revision timeline
            </Text>
            <div className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-sunken px-3">
              {submission.revisions.map((revision) => (
                <div key={revision.id} className="flex items-center justify-between gap-3 py-2">
                  <Text variant="small">Revision {revision.revisionNumber} · {revision.action}</Text>
                  <Text variant="caption" tone="muted">{formatDate(revision.createdAt)}</Text>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <form id="grading-form" action={(formData) => onGrade(submission.id, formData)} className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <Text variant="caption" tone="muted">Draft feedback with AI, then edit and save — nothing is sent without you.</Text>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={draftWithAi}
              isLoading={assistPending}
              disabled={assistPending}
            >
              {!assistPending ? <Sparkles data-icon="inline-start" /> : null}
              Draft with AI
            </Button>
          </div>
          {assistError ? (
            <Callout tone="danger" role="alert" className="text-xs">{assistError}</Callout>
          ) : null}
          <FieldRow className="sm:grid-cols-3">
            <Field>
              <FieldLabel>Grade</FieldLabel>
              <div className="relative">
                <Input
                  name="grade"
                  required
                  type="number"
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                  placeholder="0"
                  className="pr-12"
                />
                <Text variant="caption" tone="muted" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                  / {item.points}
                </Text>
              </div>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel optional>Feedback</FieldLabel>
              <Textarea
                name="feedback"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Write feedback for the student"
                rows={3}
                className="resize-none"
              />
            </Field>
          </FieldRow>

          {submission.gradingHistory.length > 0 ? (
            <div>
              <Text variant="caption" tone="muted" className="mb-2 block">
                Grading history
              </Text>
              <div className="divide-y divide-hairline rounded-lg border border-hairline">
                {submission.gradingHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <Text variant="h4">Grade: {entry.grade}</Text>
                      {entry.feedback ? <Text variant="small" tone="muted" className="mt-1">{entry.feedback}</Text> : null}
                    </div>
                    <Text variant="caption" tone="muted" className="shrink-0">{formatDate(entry.createdAt)}</Text>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
        </form>
      </div>
    </ResponsiveOverlay>
  )
}