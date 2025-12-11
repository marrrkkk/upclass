"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Timer,
  Lock,
  CheckCircle,
  HelpCircle,
  XCircle,
  Trash2,
  Settings2,
  Calendar,
  FileQuestion,
  MoreVertical,
  Clock,
  Edit
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createQuiz, submitQuiz, deleteQuiz } from "@/app/actions/quizzes"

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

  // Delete quiz state
  const [deleteQuizOpen, setDeleteQuizOpen] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()

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

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter(q => q.id !== id));
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

  const removeOption = (qId: string, optId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        if (q.options.length <= 1) return q;
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
      setQuestions([{
        id: crypto.randomUUID(),
        prompt: "",
        type: "single_choice",
        points: 1,
        options: [
          { id: crypto.randomUUID(), text: "Option 1", isCorrect: true },
          { id: crypto.randomUUID(), text: "Option 2", isCorrect: false },
        ],
      }])
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

  const handleDeleteQuiz = (quizId: string) => {
    startDeleteTransition(async () => {
      const res = await deleteQuiz(quizId)
      if (res.success) {
        setDeleteQuizOpen(null)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Quizzes</h2>

        {userRole === "teacher" && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button
                className={cn(buttonVariants({ size: "sm" }), "gap-2 shadow-sm hover:shadow-md transition-all text-white font-medium")}
                style={{ backgroundColor: classColor }}
              >
                <Plus className="h-4 w-4" />
                New Quiz
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col sm:max-w-5xl gap-0 p-0 border-none shadow-2xl bg-background">
              <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <FileQuestion className="h-5 w-5" />
                    </div>
                    Create Quiz
                  </DialogTitle>
                </div>
                <DialogDescription>Draft a quiz and publish when ready.</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/5">
                {/* Quiz Settings */}
                <div className="p-5 rounded-xl border bg-card shadow-sm space-y-6">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Quiz Settings</h3>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Title</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" className="font-medium" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none" />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Due Date (Optional)</Label>
                      <Input type="datetime-local" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value || null)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        Time Limit (Optional)
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Seconds</span>
                      </Label>
                      <Input
                        type="number"
                        value={timeLimitSeconds}
                        onChange={(e) => setTimeLimitSeconds(e.target.value)}
                        placeholder="e.g. 900 for 15 mins"
                      />
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-bold text-primary">{questions.length}</span>
                      <h3 className="font-semibold text-lg">Questions</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 bg-background shadow-sm")}
                    >
                      <Plus className="h-4 w-4" />
                      Add Question
                    </button>
                  </div>

                  <div className="space-y-6">
                    {questions.map((q, idx) => (
                      <Card key={q.id} className="border bg-card overflow-hidden shadow-sm relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted-foreground/20 group-hover:bg-primary transition-colors duration-300" />

                        <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleRemoveQuestion(q.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <CardHeader className="pl-6 py-4 bg-muted/10 border-b flex flex-row items-center gap-4 space-y-0">
                          <span className="text-sm font-semibold text-muted-foreground">Q{idx + 1}</span>
                          <Input
                            value={q.prompt}
                            onChange={(e) => handleQuestionChange(q.id, { prompt: e.target.value })}
                            placeholder="Enter your question here..."
                            className="flex-1 bg-transparent border-transparent hover:bg-background hover:border-input focus:bg-background focus:border-input transition-all font-medium text-base h-9 shadow-none"
                          />
                        </CardHeader>

                        <CardContent className="pl-6 p-4 pt-6 space-y-6">
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Question Type</Label>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Points</Label>
                              <Input
                                type="number"
                                value={q.points}
                                onChange={(e) => handleQuestionChange(q.id, { points: Number(e.target.value || 0) })}
                                className="h-9"
                              />
                            </div>
                          </div>

                          {q.type !== "short_answer" && (
                            <div className="space-y-3 bg-muted/20 p-4 rounded-lg border border-dashed">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 block">Answer Options</Label>
                              {q.options.map((opt) => (
                                <div key={opt.id} className="flex items-center gap-3">
                                  <div className="flex items-center h-9">
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
                                      className="h-4 w-4 accent-primary cursor-pointer"
                                    />
                                  </div>
                                  <Input
                                    value={opt.text}
                                    onChange={(e) => handleOptionChange(q.id, opt.id, e.target.value)}
                                    className="flex-1 h-9 bg-background"
                                    placeholder="Option text"
                                  />
                                  {q.options.length > 1 && (
                                    <button onClick={() => removeOption(q.id, opt.id)} className="text-muted-foreground hover:text-destructive p-1">
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-xs")}
                                onClick={() => addOption(q.id)}
                              >
                                <Plus className="h-3 w-3 mr-1.5" />
                                Add Option
                              </button>
                            </div>
                          )}

                          {q.type === "short_answer" && (
                            <div className="bg-muted/20 p-4 rounded-lg border border-dashed text-sm text-muted-foreground italic flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" />
                              Students will type their answer. Grading will be manual.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>

              <DialogFooter className="p-6 pt-4 border-t bg-background shrink-0 flex items-center justify-between sm:justify-between w-full">
                <div className="text-xs text-muted-foreground font-medium">
                  {questions.length} Questions • {questions.reduce((acc, q) => acc + q.points, 0)} Total Points
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "ghost" }))}
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "outline" }), "shadow-sm")}
                    onClick={() => handleCreate(false)}
                    disabled={pending}
                  >
                    {pending ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants(), "text-white shadow-md min-w-[100px]")}
                    style={{ backgroundColor: classColor }}
                    onClick={() => handleCreate(true)}
                    disabled={pending}
                  >
                    {pending ? "Publishing..." : "Publish Quiz"}
                  </button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            if (userRole === "student" && quiz.status === "draft") return null; // Students don't see drafts

            const hasAttempt = !!quiz.attempt
            const isDue = quiz.dueDate && new Date(quiz.dueDate) < new Date() && !hasAttempt

            return (
              <Card key={quiz.id} className="group border-border/60 hover:border-border transition-all hover:shadow-sm overflow-hidden border-l-[6px]" style={{ borderLeftColor: classColor }}>
                <CardHeader className="pl-5 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="mt-1 p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300"
                        style={{ '--primary': classColor } as any}
                      >
                        <FileQuestion className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors" style={{ '--primary': classColor } as any}>
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
                          <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-transparent shadow-none px-2.5 py-1 gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Completed
                          </Badge>
                          <span className="text-sm font-semibold">
                            Score: {quiz.attempt.score} / {quiz.totalPoints}
                          </span>
                        </div>
                      ) : (
                        <>
                          {userRole === 'student' && quiz.status === 'published' && (
                            <button
                              className={cn(buttonVariants({ size: "sm" }), "h-8 px-4 font-medium text-xs gap-1.5 text-white shadow-sm")}
                              style={{ backgroundColor: classColor }}
                              onClick={() => setTakeQuizId(quiz.id)}
                            >
                              Take Quiz
                            </button>
                          )}
                          {userRole === 'teacher' && (
                            <div className="text-sm text-muted-foreground">
                              {/* Teacher specific stats could go here */}
                              <span className="italic">Visible to students</span>
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

      {/* Take quiz dialog */}
      <Dialog open={!!takeQuizId} onOpenChange={(open) => setTakeQuizId(open ? takeQuizId : null)}>
        <DialogContent className="max-h-[95vh] overflow-hidden flex flex-col sm:max-w-4xl gap-0 p-0 border-none shadow-2xl bg-background">
          {activeQuiz ? (
            <>
              <DialogHeader className="p-6 pb-4 border-b bg-muted/30 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl">{activeQuiz.title}</DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><FileQuestion className="h-3.5 w-3.5" /> {activeQuiz.questions.length} Questions</span>
                      {activeQuiz.timeLimitSeconds && (
                        <span className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> {Math.round(Number(activeQuiz.timeLimitSeconds) / 60)} mins limit</span>
                      )}
                      <span>• One attempt only</span>
                    </DialogDescription>
                  </div>
                  {activeQuiz.timeLimitSeconds && (
                    <Badge variant="outline" className="text-base px-3 py-1 bg-background font-mono">
                      {/* Timer logic handles display naturally via hook if needed, for distinct display we need state */}
                      <Timer className="h-4 w-4 mr-2" />
                      {Math.floor(Number(activeQuiz.timeLimitSeconds) / 60)}:00
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/5">
                {activeQuiz.questions.map((q, idx) => (
                  <Card key={q.id} className="border shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b pb-3 pt-4 px-5">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Question {idx + 1}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">{q.points} Points</span>
                      </div>
                      <h3 className="text-lg font-medium mt-1 leading-snug">{q.prompt}</h3>
                    </CardHeader>
                    <CardContent className="p-5 pt-6">
                      {q.type === "short_answer" ? (
                        <Textarea
                          placeholder="Type your answer here..."
                          value={answers[q.id]?.text || ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: { ...prev[q.id], text: e.target.value },
                            }))
                          }
                          className="min-h-[120px] resize-none text-base"
                        />
                      ) : (
                        <div className="space-y-3">
                          {q.options.map((opt) => {
                            const selected = answers[q.id]?.selected || []
                            const isChecked = selected.includes(opt.id)
                            return (
                              <label
                                key={opt.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                                  isChecked ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-muted"
                                )}
                              >
                                <div className="flex items-center justify-center shrink-0">
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
                                    className={cn(
                                      "h-4 w-4 accent-primary",
                                      q.type === "single_choice" ? "" : "rounded-sm"
                                    )}
                                  />
                                </div>
                                <span className="text-sm font-medium">{opt.text}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {error && (
                  <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 flex items-center gap-2 font-medium">
                    <XCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>

              <DialogFooter className="p-6 pt-4 border-t bg-background shrink-0 flex justify-between w-full sm:justify-between items-center bg-muted/10">
                <div className="text-xs text-muted-foreground w-full">
                  Answers save automatically when submitting.
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "ghost" }))}
                    onClick={() => setTakeQuizId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={cn(buttonVariants(), "text-white shadow-md min-w-[120px]")}
                    style={{ backgroundColor: classColor }}
                    disabled={pending}
                    onClick={handleSubmitQuiz}
                  >
                    {pending ? "Submitting..." : "Submit Quiz"}
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

      {/* Delete Quiz Dialog */}
      {deleteQuizOpen && (() => {
        const quiz = quizzes.find(q => q.id === deleteQuizOpen)
        if (!quiz) return null
        return (
          <Dialog open={!!deleteQuizOpen} onOpenChange={(open) => !open && setDeleteQuizOpen(null)}>
            <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-hidden border-0 shadow-2xl">
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
                  "{quiz.title}"
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
    </div>
  )
}
