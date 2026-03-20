"use client"

import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, FileQuestion, Timer, XCircle } from "lucide-react"

import { submitQuiz } from "@/app/actions/quizzes"
import { OfflineRouteGuard } from "@/components/offline-route-guard"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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

      router.push(`/classes/${classId}?tab=quizzes`)
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
      <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
        <Card className="border shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <XCircle className="h-10 w-10 text-destructive/60" />
            <h1 className="text-2xl font-semibold">Quiz unavailable</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              This quiz is not published, so it cannot be taken right now.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/classes/${classId}?tab=quizzes`)}
              className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
            >
              Back to Quizzes
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (quizCompleted) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
        <Card className="border shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <CheckCircle2 className={cn("h-10 w-10", quizPendingReview ? "text-amber-600" : "text-green-600")} />
            <h1 className="text-2xl font-semibold">
              {quizPendingReview ? "Quiz submitted for review" : "Quiz already completed"}
            </h1>
            {quizPendingReview ? (
              <p className="max-w-md text-sm text-muted-foreground">
                Your answers were submitted successfully. This quiz includes short-answer questions, so your teacher
                still needs to review it before a final score is shown.
              </p>
            ) : (
              <p className="max-w-md text-sm text-muted-foreground">
                You only get one attempt for this quiz. Your score was {quiz.attempt?.score ?? "0"} out of{" "}
                {quiz.totalPoints ?? "0"}.
              </p>
            )}
            <button
              type="button"
              onClick={() => router.push(`/classes/${classId}?tab=quizzes`)}
              className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
            >
              Back to Quizzes
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
        <Card className="border shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <XCircle className="h-10 w-10 text-destructive/60" />
            <h1 className="text-2xl font-semibold">Quiz could not be loaded</h1>
            <button
              type="button"
              onClick={() => router.push(`/classes/${classId}?tab=quizzes`)}
              className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
            >
              Back to Quizzes
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selected = answers[currentQuestion.id]?.selected || []

  return (
    <OfflineRouteGuard
      title="You're offline"
      description="Quiz answering needs an internet connection so your attempt and timer stay in sync."
      backHref={`/classes/${classId}?tab=quizzes`}
      backLabel="Back to Quizzes"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8">
        <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.push(`/classes/${classId}?tab=quizzes`)}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 px-0")}
          >
            <ArrowLeft className="h-4 w-4" />
            {classTitle}
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{quiz.title}</h1>
            {quiz.description && <p className="text-sm text-muted-foreground">{quiz.description}</p>}
          </div>
        </div>

        {remainingSeconds != null && (
          <Badge variant="outline" className="bg-background px-3 py-2 font-mono text-base">
            <Timer className="mr-2 h-4 w-4" />
            {formatTimer(remainingSeconds)}
          </Badge>
        )}
      </div>

      <Card className="border shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileQuestion className="h-4 w-4" />
              Question {currentIndex + 1} of {orderedQuestions.length}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {quiz.totalPoints ?? "0"} total points
            </span>
          </div>
          <div className="font-medium" style={{ color: classColor }}>
            {currentQuestion.points} point{Number(currentQuestion.points) === 1 ? "" : "s"}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="space-y-3 border-b bg-muted/20 px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Question {currentIndex + 1}
          </p>
          <h2 className="text-xl font-medium leading-snug">{currentQuestion.prompt}</h2>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
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
              className="min-h-[180px] resize-none"
              placeholder="Type your answer here..."
            />
          ) : (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isChecked = selected.includes(option.id)
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40",
                      isChecked ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border",
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
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-medium">{option.text}</span>
                  </label>
                )
              })}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
          disabled={currentIndex === 0 || submitPending}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {isLastQuestion ? (
          <button
            type="button"
            onClick={() => submitAttempt(false)}
            disabled={submitPending}
            className={cn(buttonVariants(), "gap-2 text-white")}
            style={{ backgroundColor: classColor }}
          >
            {submitPending ? "Submitting..." : "Submit Quiz"}
            <CheckCircle2 className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIndex((value) => Math.min(orderedQuestions.length - 1, value + 1))}
            disabled={submitPending}
            className={cn(buttonVariants(), "gap-2 text-white")}
            style={{ backgroundColor: classColor }}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        </div>
      </div>
    </OfflineRouteGuard>
  )
}
