"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CheckCircle,
  ClipboardCheck,
  Clock,
  Edit,
  FileQuestion,
  MoreVertical,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react"

import { createQuiz, deleteQuiz, gradeQuizAttempt, updateQuiz } from "@/app/actions/quizzes"
import { QuizBuilderDialog } from "@/components/classes/quiz-builder-dialog"
import {
  createDraftQuestion,
  normalizeDraftQuestion,
  type DraftQuestion,
} from "@/components/classes/quiz-builder-utils"
import { QuizReviewDialog } from "@/components/classes/quiz-review-dialog"
import { QuizCardSkeleton } from "@/components/skeletons"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { IconBadge } from "@/components/ui/icon-badge"
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
import { Text } from "@/components/ui/typography"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"
import type { AiGeneratedQuiz } from "@/lib/quiz-ai"
import type { QuizData } from "@/types/classes"

type QuizTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  quizzes: QuizData[]
  classColor: string
}

type QuizRecord = QuizTabProps["quizzes"][number]

export function QuizTab({ classId, userRole, quizzes, classColor }: QuizTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const organizationPath = useOrganizationPath()
  const [createOpen, setCreateOpen] = useState(
    () => userRole === "teacher" && searchParams?.get("create") === "1",
  )
  const [startQuizId, setStartQuizId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<string>("")
  const [questions, setQuestions] = useState<DraftQuestion[]>([createDraftQuestion()])

  const [deleteQuizOpen, setDeleteQuizOpen] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const applyGeneratedQuiz = (quiz: AiGeneratedQuiz) => {
    setTitle(quiz.title)
    setDescription(quiz.description)
    setQuestions(
      quiz.questions.map((question) =>
        normalizeDraftQuestion(
          {
            id: crypto.randomUUID(),
            prompt: question.prompt,
            type: question.type,
            points: question.points,
            options: question.options.map((option) => ({
              id: crypto.randomUUID(),
              text: option.text,
              isCorrect: option.isCorrect,
            })),
          },
          question.type,
        ),
      ),
    )
    setError(null)
  }


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
  const startQuiz = quizzes.find((quiz) => quiz.id === startQuizId) ?? null
  const reviewQuiz = quizzes.find((quiz) => quiz.id === reviewQuizId) ?? null

  const publishedQuizzes = useMemo(
    () => quizzes.filter((quiz) => quiz.status === "published"),
    [quizzes],
  )

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createDraftQuestion()])
  }

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((question) => question.id !== id))
  }

  const handleQuestionChange = (id: string, update: Partial<DraftQuestion>) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== id) return question
        const nextQuestion = { ...question, ...update }
        return update.type ? normalizeDraftQuestion(nextQuestion, update.type) : nextQuestion
      }),
    )
  }

  const handleOptionChange = (questionId: string, optionId: string, text: string, isCorrect?: boolean) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, text, isCorrect: isCorrect ?? option.isCorrect } : option,
              ),
            }
          : question,
      ),
    )
  }

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId && question.type !== "true_false" && question.type !== "short_answer"
          ? {
              ...question,
              options: [...question.options, { id: crypto.randomUUID(), text: "Option", isCorrect: false }],
            }
          : question,
      ),
    )
  }

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId || question.type === "true_false" || question.type === "short_answer") return question
        if (question.options.length <= 2) return question
        return {
          ...question,
          options: question.options.filter((option) => option.id !== optionId),
        }
      }),
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
        questions: questions.map((question, index) => ({
          prompt: question.prompt,
          type: question.type,
          points: question.points,
          order: index,
          options: question.type === "short_answer" ? [] : question.options,
        })),
      }

      const fd = new FormData()
      fd.append("payload", JSON.stringify(payload))

      const res = await executeWithOfflineHandling(
        () => createQuiz(classId, fd),
        "create-quiz",
        { classId, payload },
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
      quiz.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        type: question.type,
        points: Number(question.points),
        options: normalizeDraftQuestion({
          id: question.id,
          prompt: question.prompt,
          type: question.type,
          points: Number(question.points),
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
        }).options,
      })),
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
        questions: editQuestions.map((question, index) => ({
          prompt: question.prompt,
          type: question.type,
          points: question.points,
          order: index,
          options: question.type === "short_answer" ? [] : question.options,
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

  const handleEditAddQuestion = () => {
    setEditQuestions((prev) => [...prev, createDraftQuestion()])
  }

  const handleEditRemoveQuestion = (id: string) => {
    if (editQuestions.length <= 1) return
    setEditQuestions((prev) => prev.filter((question) => question.id !== id))
  }

  const handleEditQuestionChange = (id: string, update: Partial<DraftQuestion>) => {
    setEditQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== id) return question
        const nextQuestion = { ...question, ...update }
        return update.type ? normalizeDraftQuestion(nextQuestion, update.type) : nextQuestion
      }),
    )
  }

  const handleEditOptionChange = (questionId: string, optionId: string, text: string, isCorrect?: boolean) => {
    setEditQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, text, isCorrect: isCorrect ?? option.isCorrect } : option,
              ),
            }
          : question,
      ),
    )
  }

  const addEditOption = (questionId: string) => {
    setEditQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId && question.type !== "true_false" && question.type !== "short_answer"
          ? {
              ...question,
              options: [...question.options, { id: crypto.randomUUID(), text: "Option", isCorrect: false }],
            }
          : question,
      ),
    )
  }

  const removeEditOption = (questionId: string, optionId: string) => {
    setEditQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId || question.type === "true_false" || question.type === "short_answer") return question
        if (question.options.length <= 2) return question
        return {
          ...question,
          options: question.options.filter((option) => option.id !== optionId),
        }
      }),
    )
  }

  const handleStartQuiz = (quiz: QuizRecord) => {
    setStartQuizId(null)
    router.push(organizationPath(`/classes/${classId}/quizzes/${quiz.id}?start=1`))
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

    setReviewQuizId(quiz.id)
    setReviewAttemptId(initialAttempt?.id ?? null)
  }

  const handleSaveReview = async (
    attemptId: string,
    grades: Array<{ answerId: string; pointsAwarded: number }>,
  ) => {
    const fd = new FormData()
    fd.append("grades", JSON.stringify({ answers: grades }))
    const result = await gradeQuizAttempt(attemptId, fd)
    if (result.success) {
      setReviewQuizId(null)
      setReviewAttemptId(null)
      router.refresh()
    }
    return result
  }

  return (
    <section className="space-y-4">
      {userRole === "teacher" ? (
        <div className="flex justify-end">
          <QuizBuilderDialog
            classId={classId}
            onGeneratedQuiz={applyGeneratedQuiz}
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
            trigger={<Button size="sm"><Plus aria-hidden="true" />New quiz</Button>}
          />
        </div>
      ) : null}

      {publishedQuizzes.length === 0 && userRole !== "teacher" ? (
        <Panel padding="none">
          <EmptyState
            icon={<FileQuestion />}
            title="No quizzes available"
            description="Check back later for new quizzes."
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {quizzes.length === 0 && userRole === "teacher" ? (
            <Panel padding="none">
              <EmptyState
                icon={<FileQuestion />}
                title="No quizzes created"
                description="Create your first quiz to assess your students."
              />
            </Panel>
          ) : null}

          {quizzes.map((quiz) => {
            if (deletingId === quiz.id) return <QuizCardSkeleton key={quiz.id} />
            if (userRole === "student" && quiz.status === "draft") return null

            const hasAttempt = !!quiz.attempt
            const attemptPendingReview = quiz.attempt?.status === "pending_review"
            const isDue = quiz.dueDate && new Date(quiz.dueDate) < new Date() && !hasAttempt
            const pendingAttemptsCount = quiz.attempts.filter((attempt) => attempt.status === "pending_review").length

            return (
              <Panel key={quiz.id} padding="none" className="overflow-hidden">
                <PanelHeader className="items-start">
                  <div className="flex min-w-0 items-start gap-3">
                    <IconBadge tone="neutral" size="md"><FileQuestion /></IconBadge>
                    <PanelHeading>
                      <PanelTitle>{quiz.title}</PanelTitle>
                      <PanelDescription>
                        {quiz.totalPoints ? `${quiz.totalPoints} points · ` : ""}
                        {quiz.questions.length} questions
                        {quiz.timeLimitSeconds ? ` · ${Math.round(Number(quiz.timeLimitSeconds) / 60)} min` : ""}
                      </PanelDescription>
                    </PanelHeading>
                  </div>

                  <PanelActions className="flex-wrap justify-end">
                    {quiz.status === "draft" ? <StatusBadge tone="warning">Draft</StatusBadge> : null}
                    {quiz.dueDate ? (
                      <StatusBadge tone={isDue ? "danger" : "neutral"} dot={!!isDue}>
                        <Clock aria-hidden="true" />
                        {isDue ? "Missing" : `Due ${new Date(quiz.dueDate).toLocaleDateString()}`}
                      </StatusBadge>
                    ) : null}
                    {userRole === "teacher" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${quiz.title}`}>
                            <MoreVertical aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditQuiz(quiz)}>
                            <Edit />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteQuizOpen(quiz.id)} className="text-destructive focus:text-destructive">
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </PanelActions>
                </PanelHeader>

                <PanelBody className="space-y-4">
                  {quiz.description ? <Text variant="small" tone="muted" className="max-w-[70ch]">{quiz.description}</Text> : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
                    {quiz.attempt ? (
                      <div className="flex flex-wrap items-center gap-3">
                        {attemptPendingReview ? (
                          <>
                            <StatusBadge tone="warning" dot><Clock aria-hidden="true" />Pending review</StatusBadge>
                            <Text variant="caption" tone="muted">Waiting for short-answer grading.</Text>
                          </>
                        ) : (
                          <>
                            <StatusBadge tone="success" dot><CheckCircle aria-hidden="true" />Completed</StatusBadge>
                            <Text variant="small" className="numeric-tabular">
                              Score: {quiz.attempt.score} / {quiz.totalPoints}
                            </Text>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {userRole === "student" && quiz.status === "published" ? (
                          <Button type="button" size="sm" onClick={() => setStartQuizId(quiz.id)}>Take quiz</Button>
                        ) : null}
                        {userRole === "teacher" ? (
                          <div className="ml-auto flex flex-wrap items-center gap-3">
                            <Text variant="caption" tone="muted" className="numeric-tabular">
                              {quiz.attempts.length} submitted · {pendingAttemptsCount} pending
                            </Text>
                            <Button type="button" size="sm" variant="outline" onClick={() => openReviewQuiz(quiz)}>
                              <ClipboardCheck aria-hidden="true" />
                              Review attempts
                            </Button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </PanelBody>
              </Panel>
            )
          })}
        </div>
      )}

      <Dialog open={!!startQuizId} onOpenChange={(open) => !open && setStartQuizId(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          {startQuiz ? (
            <>
              <DialogHeader>
                <DialogTitle>{startQuiz.title}</DialogTitle>
                <DialogDescription>
                  {startQuiz.questions.length} questions
                  {startQuiz.timeLimitSeconds ? ` · ${Math.round(Number(startQuiz.timeLimitSeconds) / 60)} minute limit` : ""}
                  {" · One attempt only"}
                </DialogDescription>
              </DialogHeader>

              {startQuiz.description ? <Text variant="small" tone="muted">{startQuiz.description}</Text> : null}

              <Panel variant="sunken" padding="sm">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3">
                    <Text as="dt" variant="caption" tone="muted">Questions</Text>
                    <Text as="dd" variant="small" className="numeric-tabular">{startQuiz.questions.length}</Text>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Text as="dt" variant="caption" tone="muted">Total points</Text>
                    <Text as="dd" variant="small" className="numeric-tabular">{startQuiz.totalPoints ?? "0"}</Text>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Text as="dt" variant="caption" tone="muted">Due date</Text>
                    <Text as="dd" variant="small">{startQuiz.dueDate ? new Date(startQuiz.dueDate).toLocaleString() : "No due date"}</Text>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Text as="dt" variant="caption" tone="muted">Time limit</Text>
                    <Text as="dd" variant="small">
                      {startQuiz.timeLimitSeconds
                        ? `${Math.round(Number(startQuiz.timeLimitSeconds) / 60)} minutes`
                        : "No time limit"}
                    </Text>
                  </div>
                </dl>
              </Panel>

              <Callout tone="warning">
                Starting opens the dedicated answer page and begins the timer immediately when a limit is set.
              </Callout>

              <DialogFooter className="sm:justify-between">
                <Text variant="caption" tone="muted">Review the details before starting.</Text>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setStartQuizId(null)}>Cancel</Button>
                  <Button type="button" onClick={() => handleStartQuiz(startQuiz)}>Start quiz</Button>
                </div>
              </DialogFooter>
            </>
          ) : (
            <EmptyState icon={<XCircle />} tone="danger" title="Quiz data could not be loaded" />
          )}
        </DialogContent>
      </Dialog>

      {reviewQuiz ? (
        <QuizReviewDialog
          open={!!reviewQuizId}
          onOpenChange={(open) => {
            if (!open) {
              setReviewQuizId(null)
              setReviewAttemptId(null)
            }
          }}
          quiz={reviewQuiz}
          initialAttemptId={reviewAttemptId}
          onSaveGrades={handleSaveReview}
        />
      ) : null}

      {deleteQuizOpen && (() => {
        const quiz = quizzes.find((entry) => entry.id === deleteQuizOpen)
        if (!quiz) return null
        return (
          <Dialog open={!!deleteQuizOpen} onOpenChange={(open) => !open && setDeleteQuizOpen(null)}>
            <DialogContent className="sm:max-w-[26rem]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IconBadge tone="danger" size="sm"><Trash2 /></IconBadge>
                  Delete quiz
                </DialogTitle>
                <DialogDescription>This action cannot be undone.</DialogDescription>
              </DialogHeader>
              <Callout tone="danger" icon={false}>
                Delete &ldquo;{quiz.title}&rdquo;, including all questions and student attempts?
              </Callout>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteQuizOpen(null)} disabled={deletePending}>Cancel</Button>
                <Button type="button" variant="destructive" onClick={() => handleDeleteQuiz(quiz.id)} isLoading={deletePending} disabled={deletePending}>
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      {(() => {
        const quizToEdit = quizzes.find((quiz) => quiz.id === editQuizId)
        if (!quizToEdit) return null
        return (
          <QuizBuilderDialog
            classId={classId}
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
    </section>
  )
}
