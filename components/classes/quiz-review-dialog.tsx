"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { ClipboardCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { cn } from "@/lib/utils"
import type { QuizData } from "@/types/classes"

type QuizReviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: QuizData
  /** Jump straight to a student's attempt (used by the gradebook). */
  initialAttemptId?: string | null
  onSaveGrades: (
    attemptId: string,
    grades: Array<{ answerId: string; pointsAwarded: number }>,
  ) => Promise<{ success: boolean; error?: string }>
}

type QuizAttemptRecord = QuizData["attempts"][number]

function parseSelectedOptionIds(selectedOptionIds: string | null) {
  if (!selectedOptionIds) return []
  try {
    const parsed = JSON.parse(selectedOptionIds)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available"
  return new Date(value).toLocaleString()
}

function buildGrades(quiz: QuizData, attemptId: string | null) {
  if (!attemptId) return {}
  return Object.fromEntries(
    quiz.answers
      .filter((answer) => answer.attemptId === attemptId)
      .map((answer) => [answer.id, answer.pointsAwarded ?? ""]),
  )
}

/**
 * Shared quiz attempt review surface. Controlled by the caller; used by the
 * quizzes tab and the gradebook.
 */
export function QuizReviewDialog({
  open,
  onOpenChange,
  quiz,
  initialAttemptId,
  onSaveGrades,
}: QuizReviewDialogProps) {
  const sortedAttempts = useMemo(() => {
    return [...quiz.attempts].sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "pending_review" ? -1 : 1
      }

      const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0
      const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0
      return rightTime - leftTime
    })
  }, [quiz.attempts])

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [reviewGrades, setReviewGrades] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const requested = sortedAttempts.find((attempt) => attempt.id === initialAttemptId)
    const initial = requested ?? sortedAttempts[0] ?? null
    setSelectedAttemptId(initial?.id ?? null)
    setReviewGrades(buildGrades(quiz, initial?.id ?? null))
    setError(null)
  }, [quiz.id, initialAttemptId, sortedAttempts, quiz])

  const selectedAttempt =
    sortedAttempts.find((attempt) => attempt.id === selectedAttemptId) ?? null
  const selectedReviewAnswers = selectedAttempt
    ? quiz.answers.filter((answer) => answer.attemptId === selectedAttempt.id)
    : []
  const quizHasShortAnswer = quiz.questions.some((question) => question.type === "short_answer")

  const handleSelectAttempt = (attempt: QuizAttemptRecord) => {
    setSelectedAttemptId(attempt.id)
    setReviewGrades(buildGrades(quiz, attempt.id))
    setError(null)
  }

  const handleSave = () => {
    if (!selectedAttempt) return

    const shortAnswerGrades = quiz.questions
      .filter((question) => question.type === "short_answer")
      .map((question) => {
        const answer = selectedReviewAnswers.find((entry) => entry.questionId === question.id)
        return answer
          ? {
              answerId: answer.id,
              pointsAwarded: Number(reviewGrades[answer.id] ?? answer.pointsAwarded ?? 0),
            }
          : null
      })
      .filter((entry): entry is { answerId: string; pointsAwarded: number } => entry !== null)

    setError(null)
    startTransition(async () => {
      const result = await onSaveGrades(selectedAttempt.id, shortAnswerGrades)
      if (!result.success) {
        setError(result.error || "Failed to save grade")
        return
      }

      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 border-b border-hairline px-5 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <IconBadge tone="primary" size="sm"><ClipboardCheck /></IconBadge>
            Review quiz attempts
          </DialogTitle>
          <DialogDescription>
            {quiz.title} · {quiz.attempts.length} submissions · {quiz.attempts.filter((attempt) => attempt.status === "pending_review").length} pending review
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-r border-hairline bg-surface p-3" aria-label="Quiz attempts">
            {sortedAttempts.length === 0 ? (
              <Callout tone="neutral" icon={false}>No student has submitted this quiz yet.</Callout>
            ) : (
              <div className="space-y-2">
                {sortedAttempts.map((attempt) => {
                  const selected = selectedAttempt?.id === attempt.id
                  return (
                    <button
                      key={attempt.id}
                      type="button"
                      onClick={() => handleSelectAttempt(attempt)}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "focus-ring w-full rounded-lg border border-hairline bg-card p-3 text-left",
                        selected ? "border-primary-border bg-primary-surface" : "row-interactive",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Text variant="h4" truncate>{attempt.student?.name || "Student"}</Text>
                        <StatusBadge tone={attempt.status === "pending_review" ? "warning" : "success"}>
                          {attempt.status === "pending_review" ? "Pending" : "Graded"}
                        </StatusBadge>
                      </div>
                      <Text variant="caption" tone="muted" className="mt-1">
                        Submitted {formatDateTime(attempt.submittedAt)}
                      </Text>
                      <Text variant="caption" tone="muted" className="mt-2 numeric-tabular">
                        {attempt.status === "graded"
                          ? `Score ${attempt.score ?? "0"} / ${quiz.totalPoints ?? "0"}`
                          : "Needs manual grading"}
                      </Text>
                    </button>
                  )
                })}
              </div>
            )}
          </aside>

          <div className="flex min-h-0 flex-col">
            {selectedAttempt ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
                  <div>
                    <Text as="h3" variant="h3">{selectedAttempt.student?.name || "Student"}</Text>
                    <Text variant="caption" tone="muted">
                      Submitted {formatDateTime(selectedAttempt.submittedAt)}
                      {selectedAttempt.gradedAt ? ` · Graded ${formatDateTime(selectedAttempt.gradedAt)}` : ""}
                    </Text>
                  </div>
                  <StatusBadge tone={selectedAttempt.status === "pending_review" ? "warning" : "success"} dot>
                    {selectedAttempt.status === "pending_review" ? "Pending review" : "Graded"}
                  </StatusBadge>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface p-4 sm:p-6">
                  {quiz.questions.map((question, index) => {
                    const answer = selectedReviewAnswers.find((entry) => entry.questionId === question.id)
                    const selectedOptionIds = parseSelectedOptionIds(answer?.selectedOptionIds ?? null)
                    const awardedValue =
                      answer && question.type === "short_answer"
                        ? reviewGrades[answer.id] ?? answer.pointsAwarded ?? ""
                        : answer?.pointsAwarded ?? "0"
                    const previewTotal = quiz.questions.reduce((total, currentQuestion) => {
                      const currentAnswer = selectedReviewAnswers.find((entry) => entry.questionId === currentQuestion.id)
                      if (!currentAnswer) return total
                      if (currentQuestion.type === "short_answer") {
                        return total + Number(reviewGrades[currentAnswer.id] ?? currentAnswer.pointsAwarded ?? 0)
                      }
                      return total + Number(currentAnswer.pointsAwarded ?? 0)
                    }, 0)

                    return (
                      <div key={question.id} className="divide-y divide-hairline rounded-lg border border-hairline bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                          <div className="min-w-0">
                            <Text variant="caption" tone="muted">Question {index + 1}</Text>
                            <Text variant="h4" className="mt-0.5">{question.prompt}</Text>
                          </div>
                          <StatusBadge tone="neutral">Max {question.points}</StatusBadge>
                        </div>
                        <div className="space-y-4 px-4 py-4">
                          {question.type === "short_answer" ? (
                            <>
                              <div className="rounded-md bg-surface-sunken p-3">
                                <Text variant="small" className="whitespace-pre-wrap">
                                  {answer?.textAnswer?.trim() || "No answer submitted"}
                                </Text>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-end">
                                <Field>
                                  <FieldLabel htmlFor={`grade-${answer?.id || question.id}`}>Awarded points</FieldLabel>
                                  <Input
                                    id={`grade-${answer?.id || question.id}`}
                                    type="number"
                                    min={0}
                                    max={Number(question.points)}
                                    step="1"
                                    value={awardedValue}
                                    onChange={(event) => {
                                      if (!answer) return
                                      setReviewGrades((prev) => ({ ...prev, [answer.id]: event.target.value }))
                                    }}
                                    disabled={!answer || pending}
                                  />
                                </Field>
                                <Text variant="caption" tone="muted">
                                  Enter 0–{question.points}. Running total: {previewTotal} / {quiz.totalPoints ?? "0"}
                                </Text>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-2">
                                {question.options.map((option) => {
                                  const selectedOption = selectedOptionIds.includes(option.id)
                                  return (
                                    <div
                                      key={option.id}
                                      className={cn(
                                        "flex items-center justify-between rounded-lg border border-hairline px-3 py-2",
                                        selectedOption && "border-primary-border bg-primary-surface",
                                      )}
                                    >
                                      <Text variant="small">{option.text}</Text>
                                      {selectedOption ? <StatusBadge tone="primary">Selected</StatusBadge> : null}
                                    </div>
                                  )
                                })}
                              </div>
                              <Text variant="caption" tone="muted">
                                Auto-graded: {answer?.pointsAwarded ?? "0"} / {question.points}
                              </Text>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
                </div>

                <DialogFooter className="shrink-0 border-t border-hairline px-5 py-4 sm:justify-between sm:px-6">
                  <Text variant="caption" tone="muted">Save grading to finalize the result.</Text>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                    {quizHasShortAnswer ? (
                      <Button type="button" isLoading={pending} disabled={pending} onClick={handleSave}>
                        Save grade
                      </Button>
                    ) : null}
                  </div>
                </DialogFooter>
              </>
            ) : (
              <EmptyState title="Select an attempt" description="Choose a student submission to review." />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}