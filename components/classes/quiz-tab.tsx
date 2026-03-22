"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Timer,
  CheckCircle,
  ClipboardCheck,
  XCircle,
  Trash2,
  FileQuestion,
  MoreVertical,
  Clock,
  Edit
} from "lucide-react"
import { cn } from "@/lib/utils"
import { QuizCardSkeleton } from "@/components/skeletons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QuizBuilderDialog } from "@/components/classes/quiz-builder-dialog"
import {
  createDraftQuestion,
  normalizeDraftQuestion,
  type DraftQuestion,
} from "@/components/classes/quiz-builder-utils"
import { createQuiz, deleteQuiz, gradeQuizAttempt, updateQuiz } from "@/app/actions/quizzes"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"
import type { QuizData } from "@/types/classes"

type QuizTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  quizzes: QuizData[]
  classColor: string
}

type QuizRecord = QuizTabProps["quizzes"][number]
type QuizAttemptRecord = QuizRecord["attempts"][number]

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

export function QuizTab({ classId, userRole, quizzes, classColor }: QuizTabProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [startQuizId, setStartQuizId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<string>("")
  const [questions, setQuestions] = useState<DraftQuestion[]>([createDraftQuestion()])

  // Delete quiz state
  const [deleteQuizOpen, setDeleteQuizOpen] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Edit quiz state
  const [editQuizId, setEditQuizId] = useState<string | null>(null)
  const [editPending, startEditTransition] = useTransition()
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDueDate, setEditDueDate] = useState<string | null>(null)
  const [editTimeLimitSeconds, setEditTimeLimitSeconds] = useState<string>("")
  const [editStatus, setEditStatus] = useState<"draft" | "published">("draft")
  const [editQuestions, setEditQuestions] = useState<DraftQuestion[]>([])
  const [reviewQuizId, setReviewQuizId] = useState<string | null>(null)
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null)
  const [reviewGrades, setReviewGrades] = useState<Record<string, string>>({})
  const [reviewPending, startReviewTransition] = useTransition()
  const startQuiz = quizzes.find((quiz) => quiz.id === startQuizId) ?? null
  const reviewQuiz = quizzes.find((quiz) => quiz.id === reviewQuizId) ?? null

  const publishedQuizzes = useMemo(
    () => quizzes.filter((q) => q.status === "published"),
    [quizzes],
  )
  const sortedReviewAttempts = useMemo(() => {
    if (!reviewQuiz) return []
    return [...reviewQuiz.attempts].sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "pending_review" ? -1 : 1
      }

      const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0
      const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0
      return rightTime - leftTime
    })
  }, [reviewQuiz])
  const selectedReviewAttempt =
    sortedReviewAttempts.find((attempt) => attempt.id === reviewAttemptId) ?? sortedReviewAttempts[0] ?? null
  const selectedReviewAnswers = selectedReviewAttempt
    ? reviewQuiz?.answers.filter((answer) => answer.attemptId === selectedReviewAttempt.id) ?? []
    : []
  const reviewQuizHasShortAnswer = reviewQuiz?.questions.some((question) => question.type === "short_answer") ?? false

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createDraftQuestion()])
  }

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter(q => q.id !== id));
  }

  const handleQuestionChange = (id: string, update: Partial<DraftQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const nextQuestion = { ...q, ...update }
        return update.type ? normalizeDraftQuestion(nextQuestion, update.type) : nextQuestion
      }),
    )
  }

  const handleOptionChange = (qId: string, optId: string, text: string, isCorrect?: boolean) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? {
            ...q,
            options: q.options.map((o) =>
              o.id === optId ? { ...o, text, isCorrect: isCorrect ?? o.isCorrect } : o,
            ),
          }
          : q,
      ),
    )
  }

  const addOption = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId && q.type !== "true_false" && q.type !== "short_answer"
          ? {
            ...q,
            options: [...q.options, { id: crypto.randomUUID(), text: "Option", isCorrect: false }],
          }
          : q,
      ),
    )
  }

  const removeOption = (qId: string, optId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || q.type === "true_false" || q.type === "short_answer") return q;
        if (q.options.length <= 2) return q;
        return {
          ...q,
          options: q.options.filter(o => o.id !== optId)
        }
      })
    )
  }

  const handleCreate = (publishAfterCreate = false) => {
    setError(null)

    startTransition(async () => {
      const payload = {
        title,
        description,
        dueDate,
        status: publishAfterCreate ? "published" : "draft",
        timeLimitSeconds: timeLimitSeconds ? Number(timeLimitSeconds) : null,
        questions: questions.map((q, idx) => ({
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          order: idx,
          options: q.type === "short_answer" ? [] : q.options,
        })),
      }

      const fd = new FormData()
      fd.append("payload", JSON.stringify(payload))
      
      const res = await executeWithOfflineHandling(
        () => createQuiz(classId, fd),
        'create-quiz',
        { classId, payload }
      )

      if (res.queued) {
        setError("Quiz queued. It will be synced when you're back online.")
        setTimeout(() => {
          setCreateOpen(false)
          setTitle("")
          setDescription("")
          setDueDate(null)
          setTimeLimitSeconds("")
          setQuestions([createDraftQuestion()])
        }, 2000)
        return
      }

      if (!res.success) {
        setError(res.error || "Failed to create quiz")
        return
      }

      setCreateOpen(false)
      setTitle("")
      setDescription("")
      setDueDate(null)
      setTimeLimitSeconds("")
      setQuestions([createDraftQuestion()])
      router.refresh()
    })
  }

  const handleDeleteQuiz = (quizId: string) => {
    setDeletingId(quizId)
    setDeleteQuizOpen(null)
    startDeleteTransition(async () => {
      const res = await deleteQuiz(quizId)
      if (res.success) {
        router.refresh()
      } else {
        setError(res.error)
      }
      setDeletingId(null)
    })
  }

  const openEditQuiz = (quiz: QuizRecord) => {
    setEditQuizId(quiz.id)
    setEditTitle(quiz.title)
    setEditDescription(quiz.description || "")
    setEditDueDate(quiz.dueDate ? quiz.dueDate.slice(0, 16) : null)
    setEditTimeLimitSeconds(quiz.timeLimitSeconds || "")
    setEditStatus(quiz.status)
    setEditQuestions(
      quiz.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        points: Number(q.points),
        options: normalizeDraftQuestion({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          points: Number(q.points),
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect,
          })),
        }).options,
      }))
    )
  }

  const handleUpdateQuiz = (publishAfterSave = false) => {
    if (!editQuizId) return
    setError(null)
    startEditTransition(async () => {
      const payload = {
        title: editTitle,
        description: editDescription,
        dueDate: editDueDate,
        status: publishAfterSave ? "published" : editStatus,
        timeLimitSeconds: editTimeLimitSeconds ? Number(editTimeLimitSeconds) : null,
        questions: editQuestions.map((q, idx) => ({
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          order: idx,
          options: q.type === "short_answer" ? [] : q.options,
        })),
      }

      const fd = new FormData()
      fd.append("payload", JSON.stringify(payload))
      const res = await updateQuiz(editQuizId, fd)
      if (!res.success) {
        setError(res.error)
        return
      }
      setEditQuizId(null)
      router.refresh()
    })
  }

  // Edit question helpers
  const handleEditAddQuestion = () => {
    setEditQuestions((prev) => [...prev, createDraftQuestion()])
  }

  const handleEditRemoveQuestion = (id: string) => {
    if (editQuestions.length <= 1) return
    setEditQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleEditQuestionChange = (id: string, update: Partial<DraftQuestion>) => {
    setEditQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const nextQuestion = { ...q, ...update }
        return update.type ? normalizeDraftQuestion(nextQuestion, update.type) : nextQuestion
      }),
    )
  }

  const handleEditOptionChange = (qId: string, optId: string, text: string, isCorrect?: boolean) => {
    setEditQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? {
            ...q,
            options: q.options.map((o) =>
              o.id === optId ? { ...o, text, isCorrect: isCorrect ?? o.isCorrect } : o
            ),
          }
          : q
      )
    )
  }

  const addEditOption = (qId: string) => {
    setEditQuestions((prev) =>
      prev.map((q) =>
        q.id === qId && q.type !== "true_false" && q.type !== "short_answer"
          ? {
            ...q,
            options: [...q.options, { id: crypto.randomUUID(), text: "Option", isCorrect: false }],
          }
          : q
      )
    )
  }

  const removeEditOption = (qId: string, optId: string) => {
    setEditQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || q.type === "true_false" || q.type === "short_answer") return q
        if (q.options.length <= 2) return q
        return {
          ...q,
          options: q.options.filter((o) => o.id !== optId),
        }
      })
    )
  }

  const handleStartQuiz = (quiz: QuizRecord) => {
    setStartQuizId(null)
    router.push(`/classes/${classId}/quizzes/${quiz.id}?start=1`)
  }

  const openReviewQuiz = (quiz: QuizRecord) => {
    const attempts = [...quiz.attempts].sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "pending_review" ? -1 : 1
      }

      const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0
      const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0
      return rightTime - leftTime
    })
    const initialAttempt = attempts[0] ?? null
    const initialGrades = initialAttempt
      ? Object.fromEntries(
          quiz.answers
            .filter((answer) => answer.attemptId === initialAttempt.id)
            .map((answer) => [answer.id, answer.pointsAwarded ?? ""]),
        )
      : {}

    setReviewQuizId(quiz.id)
    setReviewAttemptId(initialAttempt?.id ?? null)
    setReviewGrades(initialGrades)
  }

  const handleSelectReviewAttempt = (quiz: QuizRecord, attempt: QuizAttemptRecord) => {
    const nextGrades = Object.fromEntries(
      quiz.answers
        .filter((answer) => answer.attemptId === attempt.id)
        .map((answer) => [answer.id, answer.pointsAwarded ?? ""]),
    )

    setReviewAttemptId(attempt.id)
    setReviewGrades(nextGrades)
  }

  const handleSaveReview = () => {
    if (!reviewQuiz || !selectedReviewAttempt) return

    const shortAnswerGrades = reviewQuiz.questions
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
    startReviewTransition(async () => {
      const fd = new FormData()
      fd.append("grades", JSON.stringify({ answers: shortAnswerGrades }))
      const result = await gradeQuizAttempt(selectedReviewAttempt.id, fd)
      if (!result.success) {
        setError(result.error)
        return
      }

      setReviewQuizId(null)
      setReviewAttemptId(null)
      setReviewGrades({})
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Quizzes</h2>

        {userRole === "teacher" && (
          <QuizBuilderDialog
            mode="create"
            open={createOpen}
            title={title}
            description={description}
            dueDate={dueDate}
            timeLimitSeconds={timeLimitSeconds}
            questions={questions}
            classColor={classColor}
            error={error}
            pending={pending}
            onOpenChange={setCreateOpen}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onDueDateChange={setDueDate}
            onTimeLimitChange={setTimeLimitSeconds}
            onAddQuestion={handleAddQuestion}
            onRemoveQuestion={handleRemoveQuestion}
            onQuestionChange={handleQuestionChange}
            onOptionChange={handleOptionChange}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onCancel={() => setCreateOpen(false)}
            onSave={() => handleCreate(false)}
            onPrimaryAction={() => handleCreate(true)}
            trigger={
              <button
                className={cn(buttonVariants({ size: "sm" }), "gap-2 shadow-sm hover:shadow-md transition-all text-white font-medium")}
                style={{ backgroundColor: classColor }}
              >
                <Plus className="h-4 w-4" />
                New Quiz
              </button>
            }
          />
        )}
      </div>

      {/* Quizzes list */}
      {publishedQuizzes.length === 0 && userRole !== "teacher" ? (
        <Card className="border-dashed bg-muted/10 border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <FileQuestion className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-medium">No quizzes available</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Check back later for new quizzes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.length === 0 && userRole === "teacher" && (
            <Card className="border-dashed bg-muted/10 border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <FileQuestion className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-medium">No quizzes created</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                  Create your first quiz to assess your students.
                </p>
              </CardContent>
            </Card>
          )}

          {quizzes.map((quiz) => {
            if (deletingId === quiz.id) {
              return <QuizCardSkeleton key={quiz.id} />
            }
            if (userRole === "student" && quiz.status === "draft") return null; // Students don't see drafts

            const hasAttempt = !!quiz.attempt
            const attemptPendingReview = quiz.attempt?.status === "pending_review"
            const isDue = quiz.dueDate && new Date(quiz.dueDate) < new Date() && !hasAttempt
            const pendingAttemptsCount = quiz.attempts.filter((attempt) => attempt.status === "pending_review").length

            return (
              <Card key={quiz.id} className="group border-border/60 hover:border-border transition-all hover:shadow-sm overflow-hidden border-l-[6px]" style={{ borderLeftColor: classColor }}>
                <CardHeader className="pl-5 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="mt-1 p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300"
                      >
                        <FileQuestion className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {quiz.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {quiz.status === 'draft' && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 px-1.5 py-0 h-5">Draft</Badge>
                          )}
                          {quiz.totalPoints && (
                            <span className="font-medium">{quiz.totalPoints} pts</span>
                          )}
                          <span className="text-muted-foreground/40">•</span>
                          <span>{quiz.questions.length} Questions</span>
                          {quiz.timeLimitSeconds && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {Math.round(Number(quiz.timeLimitSeconds) / 60)} mins</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {quiz.dueDate && (
                      <Badge variant="outline" className={cn(
                        "flex shrink-0 items-center gap-1.5 font-normal px-2.5 py-1",
                        isDue ? "border-red-200 bg-red-50 text-red-700" : "bg-muted/30"
                      )}>
                        <Clock className="h-3.5 w-3.5" />
                        {isDue ? "Missing" : `Due ${new Date(quiz.dueDate).toLocaleDateString()}`}
                      </Badge>
                    )}

                    {userRole === "teacher" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-muted rounded-full text-muted-foreground focus:outline-none">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditQuiz(quiz)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteQuizOpen(quiz.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pl-5 pt-0">
                  <div className="ml-[3.75rem] space-y-4">
                    {quiz.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {quiz.description}
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      {quiz.attempt ? (
                        <div className="flex items-center gap-3">
                          {attemptPendingReview ? (
                            <>
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 px-2.5 py-1 gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Pending Review
                              </Badge>
                              <span className="text-sm font-medium text-muted-foreground">
                                Waiting for your teacher to grade the short-answer responses
                              </span>
                            </>
                          ) : (
                            <>
                              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-transparent shadow-none px-2.5 py-1 gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Completed
                              </Badge>
                              <span className="text-sm font-semibold">
                                Score: {quiz.attempt.score} / {quiz.totalPoints}
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          {userRole === 'student' && quiz.status === 'published' && (
                            <button
                              className={cn(buttonVariants({ size: "sm" }), "h-8 px-4 font-medium text-xs gap-1.5 text-white shadow-sm")}
                              style={{ backgroundColor: classColor }}
                              onClick={() => setStartQuizId(quiz.id)}
                            >
                              Take Quiz
                            </button>
                          )}
                          {userRole === 'teacher' && (
                            <div className="flex items-center gap-3">
                              <div className="text-right text-xs text-muted-foreground">
                                <div>{quiz.attempts.length} submitted</div>
                                <div>{pendingAttemptsCount} pending review</div>
                              </div>
                              <button
                                type="button"
                                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8 px-4 text-xs gap-1.5")}
                                onClick={() => openReviewQuiz(quiz)}
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Review Attempts
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Start quiz dialog */}
      <Dialog open={!!startQuizId} onOpenChange={(open) => !open && setStartQuizId(null)}>
        <DialogContent className="max-h-[95vh] overflow-y-auto flex flex-col sm:max-w-4xl gap-0 p-0 border-none shadow-2xl bg-background">
          {startQuiz ? (
            <>
              <DialogHeader className="p-6 pb-4 border-b bg-muted/30 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl">{startQuiz.title}</DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><FileQuestion className="h-3.5 w-3.5" /> {startQuiz.questions.length} Questions</span>
                      {startQuiz.timeLimitSeconds && (
                        <span className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> {Math.round(Number(startQuiz.timeLimitSeconds) / 60)} mins limit</span>
                      )}
                      <span>• One attempt only</span>
                    </DialogDescription>
                  </div>
                  {startQuiz.timeLimitSeconds && (
                    <Badge variant="outline" className="text-base px-3 py-1 bg-background font-mono">
                      <Timer className="h-4 w-4 mr-2" />
                      {Math.floor(Number(startQuiz.timeLimitSeconds) / 60)}:00
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="flex-1 min-h-0 p-6 space-y-6 bg-muted/5">
                {startQuiz.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{startQuiz.description}</p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border shadow-sm">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Questions</span>
                        <span className="font-medium">{startQuiz.questions.length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Total Points</span>
                        <span className="font-medium">{startQuiz.totalPoints ?? "0"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Attempts</span>
                        <span className="font-medium">1</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Due Date</span>
                        <span className="font-medium">
                          {startQuiz.dueDate ? new Date(startQuiz.dueDate).toLocaleString() : "No due date"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Time Limit</span>
                        <span className="font-medium">
                          {startQuiz.timeLimitSeconds
                            ? `${Math.round(Number(startQuiz.timeLimitSeconds) / 60)} minutes`
                            : "No time limit"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Starting the quiz opens the dedicated answer page and begins the timer immediately when a time limit is set.
                </div>
              </div>

              <DialogFooter className="p-6 pt-4 border-t bg-background shrink-0 flex justify-between w-full sm:justify-between items-center bg-muted/10">
                <div className="text-xs text-muted-foreground w-full">
                  Review the quiz details before starting.
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "ghost" }))}
                    onClick={() => setStartQuizId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants(), "text-white shadow-md min-w-[120px]")}
                    style={{ backgroundColor: classColor }}
                    onClick={() => handleStartQuiz(startQuiz)}
                  >
                    Start Quiz
                  </button>
                </div>
              </DialogFooter>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <XCircle className="h-10 w-10 opacity-20" />
              <p>Quiz data could not be loaded.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Teacher review dialog */}
      {reviewQuiz && (
        <Dialog
          open={!!reviewQuizId}
          onOpenChange={(open) => {
            if (!open) {
              setReviewQuizId(null)
              setReviewAttemptId(null)
              setReviewGrades({})
            }
          }}
        >
          <DialogContent className="max-h-[92vh] flex flex-col sm:max-w-6xl gap-0 p-0 border-none shadow-2xl bg-background overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Review Quiz Attempts
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {reviewQuiz.title} • {reviewQuiz.attempts.length} submissions •{" "}
                    {reviewQuiz.attempts.filter((attempt) => attempt.status === "pending_review").length} pending review
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid flex-1 min-h-0 gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="border-r bg-muted/10 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {sortedReviewAttempts.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                      No student has submitted this quiz yet.
                    </div>
                  ) : (
                    sortedReviewAttempts.map((attempt) => (
                      <button
                        key={attempt.id}
                        type="button"
                        onClick={() => handleSelectReviewAttempt(reviewQuiz, attempt)}
                        className={cn(
                          "w-full rounded-xl border bg-background p-4 text-left transition-colors",
                          selectedReviewAttempt?.id === attempt.id
                            ? "border-primary ring-1 ring-primary/20"
                            : "border-border hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{attempt.student?.name || "Student"}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Submitted {formatDateTime(attempt.submittedAt)}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              attempt.status === "pending_review"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-green-200 bg-green-50 text-green-700",
                            )}
                          >
                            {attempt.status === "pending_review" ? "Pending" : "Graded"}
                          </Badge>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          {attempt.status === "graded"
                            ? `Score ${attempt.score ?? "0"} / ${reviewQuiz.totalPoints ?? "0"}`
                            : "Needs manual grading"}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-muted/5">
                {selectedReviewAttempt ? (
                  <>
                    <div className="border-b bg-background px-6 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{selectedReviewAttempt.student?.name || "Student"}</h3>
                          <p className="text-sm text-muted-foreground">
                            Submitted {formatDateTime(selectedReviewAttempt.submittedAt)}
                            {selectedReviewAttempt.gradedAt
                              ? ` • Graded ${formatDateTime(selectedReviewAttempt.gradedAt)}`
                              : ""}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            selectedReviewAttempt.status === "pending_review"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-green-200 bg-green-50 text-green-700",
                          )}
                        >
                          {selectedReviewAttempt.status === "pending_review" ? "Pending Review" : "Graded"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {reviewQuiz.questions.map((question, index) => {
                        const answer = selectedReviewAnswers.find((entry) => entry.questionId === question.id)
                        const selectedOptionIds = parseSelectedOptionIds(answer?.selectedOptionIds ?? null)
                        const awardedValue =
                          answer && question.type === "short_answer"
                            ? reviewGrades[answer.id] ?? answer.pointsAwarded ?? ""
                            : answer?.pointsAwarded ?? "0"
                        const previewTotal = reviewQuiz.questions.reduce((total, currentQuestion) => {
                          const currentAnswer = selectedReviewAnswers.find((entry) => entry.questionId === currentQuestion.id)
                          if (!currentAnswer) return total
                          if (currentQuestion.type === "short_answer") {
                            return total + Number(reviewGrades[currentAnswer.id] ?? currentAnswer.pointsAwarded ?? 0)
                          }
                          return total + Number(currentAnswer.pointsAwarded ?? 0)
                        }, 0)

                        return (
                          <Card key={question.id} className="border shadow-sm">
                            <CardHeader className="space-y-2 border-b bg-background px-5 py-4">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-muted-foreground">Question {index + 1}</span>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Max {question.points} point{Number(question.points) === 1 ? "" : "s"}
                                </span>
                              </div>
                              <CardTitle className="text-base">{question.prompt}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 px-5 py-5">
                              {question.type === "short_answer" ? (
                                <>
                                  <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                                    {answer?.textAnswer?.trim() || "No answer submitted"}
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
                                    <div className="space-y-1">
                                      <Label htmlFor={`grade-${answer?.id || question.id}`}>Awarded Points</Label>
                                      <Input
                                        id={`grade-${answer?.id || question.id}`}
                                        type="number"
                                        min={0}
                                        max={Number(question.points)}
                                        step="1"
                                        value={awardedValue}
                                        onChange={(event) => {
                                          if (!answer) return
                                          setReviewGrades((prev) => ({
                                            ...prev,
                                            [answer.id]: event.target.value,
                                          }))
                                        }}
                                        disabled={!answer || reviewPending}
                                      />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Enter a value from 0 to {question.points}.
                                    </p>
                                  </div>
                                  <div className="text-xs font-medium text-muted-foreground">
                                    Running total: {previewTotal} / {reviewQuiz.totalPoints ?? "0"}
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
                                            "flex items-center justify-between rounded-lg border px-4 py-3 text-sm",
                                            selectedOption ? "border-primary bg-primary/5" : "border-border bg-background",
                                          )}
                                        >
                                          <span>{option.text}</span>
                                          {selectedOption && <span className="font-medium text-primary">Selected</span>}
                                        </div>
                                      )
                                    })}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Auto-graded: {answer?.pointsAwarded ?? "0"} / {question.points}
                                  </div>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}

                      {error && (
                        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
                          {error}
                        </div>
                      )}
                    </div>

                    <DialogFooter className="border-t bg-background px-6 py-4 shrink-0 flex items-center justify-between sm:justify-between">
                      <div className="text-xs text-muted-foreground">
                        Save grading to finalize the student&apos;s quiz result.
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className={cn(buttonVariants({ variant: "ghost" }))}
                          onClick={() => setReviewQuizId(null)}
                        >
                          Close
                        </button>
                        {reviewQuizHasShortAnswer ? (
                          <button
                            type="button"
                            className={cn(buttonVariants(), "text-white")}
                            style={{ backgroundColor: classColor }}
                            disabled={reviewPending}
                            onClick={handleSaveReview}
                          >
                            {reviewPending ? "Saving..." : "Save Grade"}
                          </button>
                        ) : null}
                      </div>
                    </DialogFooter>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                    Select a student attempt to review.
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Quiz Dialog */}
      {deleteQuizOpen && (() => {
        const quiz = quizzes.find(q => q.id === deleteQuizOpen)
        if (!quiz) return null
        return (
          <Dialog open={!!deleteQuizOpen} onOpenChange={(open) => !open && setDeleteQuizOpen(null)}>
            <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)]">
              <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border-b border-destructive/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold">Delete Quiz</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      This action cannot be undone
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this quiz?
                </p>
                <p className="text-lg font-semibold text-foreground truncate">
                  &ldquo;{quiz.title}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground">
                  All questions and student attempts will also be deleted.
                </p>
              </div>

              <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-center gap-3">
                <button type="button" onClick={() => setDeleteQuizOpen(null)} disabled={deletePending} className={cn(buttonVariants({ variant: "outline" }), "min-w-[100px]")}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleDeleteQuiz(quiz.id)} disabled={deletePending} className={cn(buttonVariants({ variant: "destructive" }), "min-w-[120px] gap-2")}>
                  {deletePending ? "Deleting..." : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Edit Quiz Dialog */}
      {(() => {
        const quizToEdit = quizzes.find((q) => q.id === editQuizId)
        if (!quizToEdit) return null
        return (
          <QuizBuilderDialog
            mode="edit"
            open={!!editQuizId}
            title={editTitle}
            description={editDescription}
            dueDate={editDueDate}
            timeLimitSeconds={editTimeLimitSeconds}
            status={editStatus}
            questions={editQuestions}
            classColor={classColor}
            error={error}
            pending={editPending}
            onOpenChange={(open) => !open && setEditQuizId(null)}
            onTitleChange={setEditTitle}
            onDescriptionChange={setEditDescription}
            onDueDateChange={setEditDueDate}
            onTimeLimitChange={setEditTimeLimitSeconds}
            onStatusChange={setEditStatus}
            onAddQuestion={handleEditAddQuestion}
            onRemoveQuestion={handleEditRemoveQuestion}
            onQuestionChange={handleEditQuestionChange}
            onOptionChange={handleEditOptionChange}
            onAddOption={addEditOption}
            onRemoveOption={removeEditOption}
            onCancel={() => setEditQuizId(null)}
            onSave={() => handleUpdateQuiz(false)}
            onPrimaryAction={() => handleUpdateQuiz(true)}
          />
        )
      })()}
    </div>
  )
}
