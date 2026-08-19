"use client"

import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, FileQuestion, Timer, XCircle } from "lucide-react"

import { submitQuiz } from "@/app/actions/quizzes"
import { OfflineRouteGuard } from "@/components/offline-route-guard"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { CourseSwatch } from "@/components/ui/course-identity"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel"
import { PageContainer } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { cn } from "@/lib/utils"

type QuizTakingPageProps = {
  classId: string
  classTitle: string
  classColor: string
  quiz: {
    id: string
    title: string
    description: string | null
    dueDate: string | null
    timeLimitSeconds: string | null
    totalPoints: string | null
    status: "draft" | "published"
    attempt: {
      id: string
      status: "pending_review" | "graded"
      score: string | null
      submittedAt: string | null
      gradedAt: string | null
    } | null
    questions: Array<{
      id: string
      prompt: string
      type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
      points: string
      order: string
      options: Array<{ id: string; text: string; isCorrect: boolean }>
    }>
  }
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

export function QuizTakingPage({ classId, classTitle, classColor, quiz }: QuizTakingPageProps) {
  const router = useRouter()
  const organizationPath = useOrganizationPath()
  const quizzesPath = organizationPath(`/classes/${classId}?tab=quizzes`)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { selected?: string[]; text?: string }>>({})
  const [error, setError] = useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(
    quiz.timeLimitSeconds ? Number(quiz.timeLimitSeconds) : null,
  )
  const [startedAt] = useState(() => Date.now())
  const [submitPending, startSubmitTransition] = useTransition()
  const autoSubmitTriggeredRef = useRef(false)

  const orderedQuestions = useMemo(
    () =>
      [...quiz.questions].sort((a, b) => {
        const aOrder = Number(a.order)
        const bOrder = Number(b.order)
        return aOrder - bOrder
      }),
    [quiz.questions],
  )

  const currentQuestion = orderedQuestions[currentIndex]
  const isLastQuestion = currentIndex === orderedQuestions.length - 1
  const quizUnavailable = quiz.status !== "published"
  const quizCompleted = !!quiz.attempt
  const quizPendingReview = quiz.attempt?.status === "pending_review"

  useEffect(() => {
    if (remainingSeconds == null || quizUnavailable || quizCompleted || submitPending) {
      return
    }

    if (remainingSeconds <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value == null) return value
        return value > 0 ? value - 1 : 0
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [quizCompleted, quizUnavailable, remainingSeconds, submitPending])

  const submitAttempt = (isAutoSubmit = false) => {
    if (submitPending || quizUnavailable || quizCompleted) return

    setError(null)
    startSubmitTransition(async () => {
      const answersPayload = orderedQuestions.map((question) => ({
        questionId: question.id,
        selectedOptionIds: answers[question.id]?.selected || [],
        textAnswer: answers[question.id]?.text || "",
      }))

      const fd = new FormData()
      fd.append("answers", JSON.stringify(answersPayload))
      fd.append("timeSpentSeconds", String(Math.round((Date.now() - startedAt) / 1000)))

      const result = await submitQuiz(quiz.id, fd)
      if (!result.success) {
        setError(result.error)
        if (isAutoSubmit) {
          autoSubmitTriggeredRef.current = false
        }
        return
      }

      router.push(quizzesPath)
      router.refresh()
    })
  }

  const autoSubmitOnTimeout = useEffectEvent(() => {
    autoSubmitTriggeredRef.current = true
    submitAttempt(true)
  })

  useEffect(() => {
    if (remainingSeconds !== 0 || autoSubmitTriggeredRef.current || quizUnavailable || quizCompleted) {
      return
    }

    autoSubmitOnTimeout()
  }, [quizCompleted, quizUnavailable, remainingSeconds])

  if (quizUnavailable) {
    return (
      <PageContainer width="narrow" className="py-8">
        <Panel padding="none">
          <EmptyState
            icon={<XCircle />}
            tone="danger"
            title="Quiz unavailable"
            description="This quiz is not published, so it cannot be taken right now."
            action={<Button variant="outline" onClick={() => router.push(quizzesPath)}>Back to quizzes</Button>}
          />
        </Panel>
      </PageContainer>
    )
  }

  if (quizCompleted) {
    return (
      <PageContainer width="narrow" className="py-8">
        <Panel padding="none">
          <EmptyState
            icon={<CheckCircle2 />}
            tone={quizPendingReview ? "warning" : "success"}
            title={quizPendingReview ? "Quiz submitted for review" : "Quiz already completed"}
            description={
              quizPendingReview
                ? "Your answers were submitted successfully. Your teacher still needs to review the short-answer responses before a final score is shown."
                : `You only get one attempt for this quiz. Your score was ${quiz.attempt?.score ?? "0"} out of ${quiz.totalPoints ?? "0"}.`
            }
            action={<Button variant="outline" onClick={() => router.push(quizzesPath)}>Back to quizzes</Button>}
          />
        </Panel>
      </PageContainer>
    )
  }

  if (!currentQuestion) {
    return (
      <PageContainer width="narrow" className="py-8">
        <Panel padding="none">
          <EmptyState
            icon={<XCircle />}
            tone="danger"
            title="Quiz could not be loaded"
            action={<Button variant="outline" onClick={() => router.push(quizzesPath)}>Back to quizzes</Button>}
          />
        </Panel>
      </PageContainer>
    )
  }

  const selected = answers[currentQuestion.id]?.selected || []

  return (
    <OfflineRouteGuard
      title="You're offline"
      description="Quiz answering needs an internet connection so your attempt and timer stay in sync."
      backHref={quizzesPath}
      backLabel="Back to Quizzes"
    >
      <PageContainer width="content" className="py-6 sm:py-8">
        <Panel padding="none" className="overflow-hidden">
          <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <CourseSwatch value={classColor} courseKey={classId} size="lg" />
              <div className="min-w-0 space-y-1">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => router.push(quizzesPath)}
                  className="h-auto px-0"
                >
                  <ArrowLeft aria-hidden="true" />
                  {classTitle}
                </Button>
                <Text as="h1" variant="h1">{quiz.title}</Text>
                {quiz.description ? <Text variant="small" tone="muted">{quiz.description}</Text> : null}
              </div>
            </div>

            {remainingSeconds != null ? (
              <StatusBadge tone={remainingSeconds <= 60 ? "warning" : "neutral"} dot={remainingSeconds <= 60} className="type-mono numeric-tabular">
                <Timer aria-hidden="true" />
                {formatTimer(remainingSeconds)}
              </StatusBadge>
            ) : null}
          </PanelBody>
        </Panel>

        <Panel padding="none">
          <PanelBody className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileQuestion className="size-4" aria-hidden="true" />
                <Text variant="caption" tone="muted" className="numeric-tabular">
                  Question {currentIndex + 1} of {orderedQuestions.length}
                </Text>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden="true" />
                <Text variant="caption" tone="muted" className="numeric-tabular">
                  {quiz.totalPoints ?? "0"} total points
                </Text>
              </span>
            </div>
            <StatusBadge tone="primary">{currentQuestion.points} point{Number(currentQuestion.points) === 1 ? "" : "s"}</StatusBadge>
          </PanelBody>
        </Panel>

        <Panel padding="none" className="overflow-hidden">
          <PanelHeader className="block space-y-1.5 bg-surface-sunken">
            <Text variant="overline" tone="primary">Question {currentIndex + 1}</Text>
            <Text as="h2" variant="h2">{currentQuestion.prompt}</Text>
          </PanelHeader>

          <PanelBody className="space-y-4">
            {currentQuestion.type === "short_answer" ? (
              <Textarea
                value={answers[currentQuestion.id]?.text || ""}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: {
                      ...prev[currentQuestion.id],
                      text: event.target.value,
                    },
                  }))
                }
                className="min-h-44 resize-none"
                placeholder="Type your answer here"
              />
            ) : (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
                  const isChecked = selected.includes(option.id)
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "focus-within:focus-ring row-interactive flex cursor-pointer items-center gap-3 rounded-lg border border-hairline px-4 py-3",
                        isChecked && "border-primary-border bg-primary-surface",
                      )}
                    >
                      <input
                        type={currentQuestion.type === "multiple_select" ? "checkbox" : "radio"}
                        name={`question-${currentQuestion.id}`}
                        checked={isChecked}
                        onChange={(event) => {
                          if (currentQuestion.type === "multiple_select") {
                            const nextSelected = event.target.checked
                              ? [...selected, option.id]
                              : selected.filter((value) => value !== option.id)

                            setAnswers((prev) => ({
                              ...prev,
                              [currentQuestion.id]: {
                                ...prev[currentQuestion.id],
                                selected: nextSelected,
                              },
                            }))
                            return
                          }

                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: {
                              ...prev[currentQuestion.id],
                              selected: [option.id],
                            },
                          }))
                        }}
                        className="size-4 accent-primary"
                      />
                      <Text variant="small">{option.text}</Text>
                    </label>
                  )
                })}
              </div>
            )}

            {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
          </PanelBody>
        </Panel>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0 || submitPending}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>

          {isLastQuestion ? (
            <Button type="button" onClick={() => submitAttempt(false)} disabled={submitPending}>
              {submitPending ? "Submitting..." : "Submit quiz"}
              <CheckCircle2 aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setCurrentIndex((value) => Math.min(orderedQuestions.length - 1, value + 1))}
              disabled={submitPending}
            >
              Next
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </PageContainer>
    </OfflineRouteGuard>
  )
}
