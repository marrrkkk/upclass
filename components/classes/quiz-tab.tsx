"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Timer, Lock, CheckCircle, HelpCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createQuiz, submitQuiz } from "@/app/actions/quizzes"

type QuizTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  quizzes: Array<{
    id: string
    classId: string
    title: string
    description: string | null
    status: "draft" | "published"
    dueDate: string | null
    timeLimitSeconds: string | null
    totalPoints: string | null
    createdAt: string
    updatedAt: string
    questions: Array<{
      id: string
      prompt: string
      type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
      points: string
      order: string
      options: Array<{ id: string; text: string; isCorrect: boolean }>
    }>
    attempt: {
      id: string
      quizId: string
      studentId: string
      score: string | null
      submittedAt: string | null
      timeSpentSeconds: string | null
    } | null
    answers: Array<{
      id: string
      attemptId: string
      questionId: string
      selectedOptionIds: string | null
      textAnswer: string | null
      isCorrect: boolean | null
      pointsAwarded: string | null
    }>
  }>
  classColor: string
}

type DraftQuestion = {
  id: string
  prompt: string
  type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
  points: number
  options: Array<{ id: string; text: string; isCorrect: boolean }>
}

export function QuizTab({ classId, userId, userRole, quizzes, classColor }: QuizTabProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [takeQuizId, setTakeQuizId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<string>("")
  const [status, setStatus] = useState<"draft" | "published">("draft")
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    {
      id: crypto.randomUUID(),
      prompt: "",
      type: "single_choice",
      points: 1,
      options: [
        { id: crypto.randomUUID(), text: "Option 1", isCorrect: true },
        { id: crypto.randomUUID(), text: "Option 2", isCorrect: false },
      ],
    },
  ])

  // Taking quiz
  const activeQuiz = quizzes.find((q) => q.id === takeQuizId)
  const [answers, setAnswers] = useState<Record<string, { selected?: string[]; text?: string }>>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)

  useEffect(() => {
    if (takeQuizId) {
      setStartedAt(Date.now())
      setAnswers({})
    }
  }, [takeQuizId])

  const publishedQuizzes = useMemo(
    () => quizzes.filter((q) => q.status === "published"),
    [quizzes],
  )

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        prompt: "",
        type: "single_choice",
        points: 1,
        options: [
          { id: crypto.randomUUID(), text: "Option 1", isCorrect: true },
          { id: crypto.randomUUID(), text: "Option 2", isCorrect: false },
        ],
      },
    ])
  }

  const handleQuestionChange = (id: string, update: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...update } : q)))
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
        q.id === qId
          ? {
            ...q,
            options: [...q.options, { id: crypto.randomUUID(), text: "Option", isCorrect: false }],
          }
          : q,
      ),
    )
  }

  const handleCreate = (publishAfterCreate = false) => {
    setError(null)
    startTransition(async () => {
      const payload = {
        title,
        description,
        dueDate,
        status: publishAfterCreate ? "published" : status,
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
      const res = await createQuiz(classId, fd)
      if (!res.success) {
        setError(res.error)
        return
      }
      setCreateOpen(false)
      setTitle("")
      setDescription("")
      setDueDate(null)
      setTimeLimitSeconds("")
      router.refresh()
    })
  }

  const handleSubmitQuiz = () => {
    if (!activeQuiz || !userId) return
    setError(null)
    const answersPayload = activeQuiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id]?.selected || [],
      textAnswer: answers[q.id]?.text || "",
    }))
    startTransition(async () => {
      const fd = new FormData()
      fd.append("answers", JSON.stringify(answersPayload))
      if (startedAt) {
        const delta = Math.round((Date.now() - startedAt) / 1000)
        fd.append("timeSpentSeconds", String(delta))
      }
      const res = await submitQuiz(activeQuiz.id, fd)
      if (!res.success) {
        setError(res.error)
        return
      }
      setTakeQuizId(null)
      router.refresh()
    })
  }

  const renderStatusPill = (q: typeof quizzes[number]) => {
    if (q.status === "draft") {
      return (
        <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-medium">
          Draft
        </span>
      )
    }
    return (
      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
        Published
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {userRole === "teacher" && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <button
              className={cn(buttonVariants({ size: "sm" }), "w-fit gap-2 text-white shadow-md hover:shadow-lg transition-all")}
              style={{ backgroundColor: classColor }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New Quiz
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl gap-0 p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Create Quiz</DialogTitle>
              <DialogDescription>Draft a quiz and publish when ready. Students can submit only once.</DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="h-10 w-full rounded-md border border-muted-foreground/20 bg-muted/20 px-3 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Due Date (optional)</Label>
                  <Input type="datetime-local" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value || null)} />
                </div>
                <div className="space-y-2">
                  <Label>Time Limit (seconds, optional)</Label>
                  <Input
                    type="number"
                    value={timeLimitSeconds}
                    onChange={(e) => setTimeLimitSeconds(e.target.value)}
                    placeholder="e.g. 900"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Questions</Label>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{questions.length} total</span>
                    <button
                      type="button"
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8 px-3")}
                      onClick={handleAddQuestion}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add question
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <Card key={q.id} className="border-muted-foreground/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        value={q.prompt}
                        onChange={(e) => handleQuestionChange(q.id, { prompt: e.target.value })}
                        placeholder="Question prompt"
                      />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label>Type</Label>
                          <select
                            className="h-10 w-full rounded-md border border-muted-foreground/20 bg-muted/20 px-3 text-sm"
                            value={q.type}
                            onChange={(e) =>
                              handleQuestionChange(q.id, { type: e.target.value as DraftQuestion["type"] })
                            }
                          >
                            <option value="single_choice">Multiple Choice</option>
                            <option value="multiple_select">Multiple Select</option>
                            <option value="true_false">True / False</option>
                            <option value="short_answer">Short Answer</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Points</Label>
                          <Input
                            type="number"
                            value={q.points}
                            onChange={(e) => handleQuestionChange(q.id, { points: Number(e.target.value || 0) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Options</Label>
                          <div className="text-xs text-muted-foreground">
                            {q.type === "short_answer" ? "Short answers are manual grade." : "Mark correct choice(s)."}
                          </div>
                        </div>
                      </div>

                      {q.type !== "short_answer" && (
                        <div className="space-y-2">
                          {q.options.map((opt) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <input
                                type={q.type === "multiple_select" ? "checkbox" : "radio"}
                                name={`correct-${q.id}`}
                                checked={opt.isCorrect}
                                onChange={(e) => {
                                  if (q.type === "multiple_select") {
                                    handleOptionChange(q.id, opt.id, opt.text, e.target.checked)
                                  } else {
                                    handleQuestionChange(q.id, {
                                      options: q.options.map((o) => ({ ...o, isCorrect: o.id === opt.id })),
                                    })
                                  }
                                }}
                              />
                              <Input
                                value={opt.text}
                                onChange={(e) => handleOptionChange(q.id, opt.id, e.target.value)}
                                className="flex-1"
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}
                            onClick={() => addOption(q.id)}
                          >
                            Add option
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}
            </div>
            <DialogFooter className="p-6 pt-0 flex items-center gap-3">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "ghost" }))}
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "secondary" }), "shadow-sm")}
                onClick={() => handleCreate(false)}
                disabled={pending}
              >
                {pending ? "Saving..." : "Save draft"}
              </button>
              <button
                type="button"
                className={cn(buttonVariants(), "text-white shadow-md")}
                style={{ backgroundColor: classColor }}
                onClick={() => handleCreate(true)}
                disabled={pending}
              >
                {pending ? "Publishing..." : "Publish"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Quizzes list */}
      {publishedQuizzes.length === 0 && userRole !== "teacher" && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            No quizzes yet.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {quizzes.map((quiz) => {
          const hasAttempt = !!quiz.attempt
          return (
            <Card key={quiz.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  {quiz.description && (
                    <p className="text-sm text-muted-foreground">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{quiz.status === "published" ? "Published" : "Draft"}</span>
                    {quiz.timeLimitSeconds && (
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" />
                        {quiz.timeLimitSeconds} sec
                      </span>
                    )}
                    {quiz.totalPoints && <span>{quiz.totalPoints} pts</span>}
                    {quiz.dueDate && <span>Due {new Date(quiz.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                {renderStatusPill(quiz)}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="text-sm text-muted-foreground">
                  {quiz.questions.length} questions
                </div>
                {quiz.attempt && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Submitted — Score: {quiz.attempt.score ?? "—"}
                  </div>
                )}
                {!quiz.attempt && quiz.status === "published" && userRole === "student" && (
                  <button
                    className={cn(buttonVariants({ size: "sm" }), "w-fit gap-2 text-white")}
                    style={{ backgroundColor: classColor }}
                    onClick={() => setTakeQuizId(quiz.id)}
                  >
                    Take Quiz
                  </button>
                )}
                {userRole === "teacher" && quiz.status === "draft" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    Draft - publish to make available
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Take quiz dialog */}
      <Dialog open={!!takeQuizId} onOpenChange={(open) => setTakeQuizId(open ? takeQuizId : null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl gap-0 p-0">
          {activeQuiz ? (
            <>
              <DialogHeader className="p-6 pb-2">
                <DialogTitle>{activeQuiz.title}</DialogTitle>
                <DialogDescription>
                  {activeQuiz.timeLimitSeconds
                    ? `Time limit: ${activeQuiz.timeLimitSeconds} seconds. You can submit only once.`
                    : "You can submit only once."}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-5">
                {activeQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">Q{idx + 1}. {q.prompt}</p>
                        <p className="text-xs text-muted-foreground">
                          {q.type.replace("_", " ")} • {q.points} pts
                        </p>
                      </div>
                      {q.type === "short_answer" && (
                        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" /> Manual grade
                        </span>
                      )}
                    </div>
                    {q.type === "short_answer" && (
                      <Textarea
                        placeholder="Your answer"
                        value={answers[q.id]?.text || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], text: e.target.value },
                          }))
                        }
                      />
                    )}
                    {q.type !== "short_answer" && (
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const selected = answers[q.id]?.selected || []
                          const isChecked = selected.includes(opt.id)
                          return (
                            <label key={opt.id} className="flex items-center gap-2 text-sm">
                              <input
                                type={q.type === "multiple_select" ? "checkbox" : "radio"}
                                name={`q-${q.id}`}
                                checked={isChecked}
                                onChange={(e) => {
                                  if (q.type === "multiple_select") {
                                    const next = e.target.checked
                                      ? [...selected, opt.id]
                                      : selected.filter((id) => id !== opt.id)
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: { ...prev[q.id], selected: next },
                                    }))
                                  } else {
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: { ...prev[q.id], selected: [opt.id] },
                                    }))
                                  }
                                }}
                              />
                              <span>{opt.text}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                    {error}
                  </div>
                )}
              </div>
              <DialogFooter className="p-6 pt-0 flex items-center gap-3">
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "ghost" }))}
                  onClick={() => setTakeQuizId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={cn(buttonVariants(), "text-white")}
                  style={{ backgroundColor: classColor }}
                  disabled={pending}
                  onClick={handleSubmitQuiz}
                >
                  {pending ? "Submitting..." : "Submit once"}
                </button>
              </DialogFooter>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">No quiz selected.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

