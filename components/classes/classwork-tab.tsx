"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Calendar, FileText, Plus, Upload } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClasswork, submitClasswork, gradeSubmission } from "@/app/actions/class-detail"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

type ClassworkData = {
  id: string
  title: string
  description: string | null
  type: string
  dueDate: string | null
  points: string | null
  createdAt: string
}

type SubmissionData = {
  id: string
  classworkId: string
  studentId: string
  content: string | null
  fileUrl: string | null
  fileName: string | null
  status: string
  grade: string | null
  feedback: string | null
  submittedAt: string | null
  gradedAt: string | null
  student: {
    id: string
    name: string
    image: string | null
  }
}

type ClassworkTabProps = {
  classId: string
  userId: string
  userRole: "teacher" | "student"
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  classColor: string
}

export function ClassworkTab({ classId, userId, userRole, classwork, submissions, classColor }: ClassworkTabProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState<string | null>(null)
  const [gradeOpen, setGradeOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Set up realtime subscriptions for classwork and submissions
  useEffect(() => {
    if (!supabase) return

    // Subscribe to classwork changes
    const classworkChannel = supabase
      .channel(`classwork:${classId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classwork",
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          router.refresh()
        }
      )
      .subscribe()

    // Subscribe to submissions changes
    const classworkIds = new Set(classwork.map(c => c.id))

    const submissionsChannel = supabase
      .channel(`submissions:${classId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          ...(userRole === "student"
            ? { filter: `student_id=eq.${userId}` }
            : {}),
        },
        (payload) => {
          // For teachers, only refresh if the submission is for a classwork in this class
          if (userRole === "teacher") {
            const newRecord = payload.new as any
            const oldRecord = payload.old as any
            const submissionClassworkId = newRecord?.classwork_id || oldRecord?.classwork_id

            if (submissionClassworkId && classworkIds.has(submissionClassworkId)) {
              router.refresh()
            }
          } else {
            // For students, we already filtered by student_id, so refresh
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(classworkChannel)
      supabase?.removeChannel(submissionsChannel)
    }
  }, [classId, userId, userRole, router, classwork])

  const handleCreateClasswork = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await createClasswork(classId, formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      setCreateOpen(false)
    })
  }

  const handleSubmit = async (classworkId: string, formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await submitClasswork(classworkId, formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      setSubmitOpen(null)
    })
  }

  const handleGrade = async (submissionId: string, formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await gradeSubmission(submissionId, formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      setGradeOpen(null)
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getSubmissionForClasswork = (classworkId: string) => {
    // For students, only return their own submission
    // For teachers, this function isn't used (they see all submissions)
    return submissions.find((s) => s.classworkId === classworkId && s.studentId === userId)
  }

  const getSubmissionsForClasswork = (classworkId: string) => {
    return submissions.filter((s) => s.classworkId === classworkId)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Create Classwork Button (only for teachers) */}
      {userRole === "teacher" && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <button
              className={cn(buttonVariants({ size: "sm" }), "w-fit gap-2 text-white shadow-md hover:shadow-lg transition-all")}
              style={{ backgroundColor: classColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1"
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Create classwork
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-hidden border-0 shadow-2xl">
            <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10">
              <DialogTitle className="text-xl font-semibold tracking-tight">Create Classwork</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create an assignment, quiz, or material for your students.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreateClasswork} className="p-6 space-y-6">
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="classwork-title" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Title</Label>
                  <Input
                    id="classwork-title"
                    name="title"
                    required
                    placeholder="e.g. Chapter 5 Quiz"
                    className="h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classwork-description" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Description</Label>
                  <Textarea
                    id="classwork-description"
                    name="description"
                    placeholder="Add instructions or details..."
                    rows={3}
                    className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="classwork-type" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Type</Label>
                    <div className="relative">
                      <select
                        id="classwork-type"
                        name="type"
                        className="h-10 w-full appearance-none rounded-md border border-muted-foreground/20 bg-muted/20 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="assignment">Assignment</option>
                        <option value="quiz">Quiz</option>
                        <option value="material">Material</option>
                      </select>
                      {/* Custom arrow could go here */}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classwork-points" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Max Points</Label>
                    <Input
                      id="classwork-points"
                      name="points"
                      type="number"
                      placeholder="e.g. 100"
                      className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classwork-dueDate" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Due Date</Label>
                  <Input
                    id="classwork-dueDate"
                    name="dueDate"
                    type="datetime-local"
                    className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
                  {error}
                </div>
              )}

              <DialogFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(buttonVariants(), "text-white disabled:opacity-70 shadow-md hover:shadow-lg transition-all min-w-[100px]")}
                  style={{ backgroundColor: classColor }}
                  onMouseEnter={(e) => {
                    if (!pending) e.currentTarget.style.opacity = "0.9"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1"
                  }}
                >
                  {pending ? "Creating..." : "Create"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Classwork List */}
      {classwork.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No classwork yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {classwork.map((item) => {
            const submission = getSubmissionForClasswork(item.id)
            const allSubmissions = getSubmissionsForClasswork(item.id)

            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      {item.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {item.type}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {item.points && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{item.points} points</span>
                      </div>
                    )}
                    {item.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due {formatDate(item.dueDate)}</span>
                      </div>
                    )}
                  </div>

                  {userRole === "student" ? (
                    <div className="space-y-2">
                      {submission ? (
                        <div className="rounded-md border bg-muted/50 p-3">
                          <p className="text-sm font-medium">
                            Status:{" "}
                            <span
                              className={cn(
                                submission.status === "graded"
                                  ? "text-green-600"
                                  : submission.status === "submitted"
                                    ? "text-blue-600"
                                    : "text-muted-foreground",
                              )}
                            >
                              {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                            </span>
                          </p>
                          {submission.grade && (
                            <p className="mt-1 text-sm">
                              Grade: <span className="font-semibold">{submission.grade}</span>
                              {item.points && ` / ${item.points}`}
                            </p>
                          )}
                          {submission.feedback && (
                            <p className="mt-2 text-sm text-muted-foreground">{submission.feedback}</p>
                          )}
                        </div>
                      ) : (
                        <Dialog open={submitOpen === item.id} onOpenChange={(open) => setSubmitOpen(open ? item.id : null)}>
                          <DialogTrigger asChild>
                            <button
                              className={cn(buttonVariants({ size: "sm" }), "gap-2 text-white shadow-sm hover:shadow-md transition-all")}
                              style={{ backgroundColor: classColor }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "0.9"
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "1"
                              }}
                              type="button"
                            >
                              <Upload className="h-4 w-4" />
                              Submit
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden border-0 shadow-2xl">
                            <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10">
                              <DialogTitle className="text-xl font-semibold tracking-tight">Submit Assignment</DialogTitle>
                              <DialogDescription className="text-muted-foreground">
                                Submit your work for &quot;{item.title}&quot;
                              </DialogDescription>
                            </DialogHeader>
                            <form action={(fd) => handleSubmit(item.id, fd)} className="p-6 space-y-6">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Your Work</Label>
                                  <textarea
                                    name="content"
                                    placeholder="Write your submission content or comments here..."
                                    className="w-full rounded-md border border-muted-foreground/20 bg-muted/20 px-4 py-3 text-sm outline-none focus:bg-background focus:ring-1 focus:ring-primary transition-all resize-none"
                                    rows={5}
                                  />
                                </div>
                                <div className="grid gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">File URL (Optional)</Label>
                                    <Input
                                      name="fileUrl"
                                      type="url"
                                      placeholder="https://drive.google.com/..."
                                      className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">File Name (Optional)</Label>
                                    <Input
                                      name="fileName"
                                      placeholder="Project_Details.pdf"
                                      className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                                    />
                                  </div>
                                </div>
                              </div>

                              {error && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
                                  {error}
                                </div>
                              )}

                              <DialogFooter className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setSubmitOpen(null)}
                                  className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={pending}
                                  className={cn(buttonVariants(), "text-white disabled:opacity-70 shadow-md hover:shadow-lg transition-all min-w-[100px]")}
                                  style={{ backgroundColor: classColor }}
                                  onMouseEnter={(e) => {
                                    if (!pending) e.currentTarget.style.opacity = "0.9"
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = "1"
                                  }}
                                >
                                  {pending ? "Submitting..." : "Submit"}
                                </button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Submissions: {allSubmissions.length}
                      </p>
                      {allSubmissions.length > 0 && (
                        <div className="space-y-2">
                          {allSubmissions.map((sub) => (
                            <div key={sub.id} className="rounded-md border bg-muted/50 p-3">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{sub.student.name}</p>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-1 text-xs",
                                    sub.status === "graded"
                                      ? "bg-green-100 text-green-700"
                                      : sub.status === "submitted"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-700",
                                  )}
                                >
                                  {sub.status}
                                </span>
                              </div>
                              {sub.content && (
                                <p className="mt-2 text-sm text-muted-foreground">{sub.content}</p>
                              )}
                              {sub.fileUrl && (
                                <a
                                  href={sub.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  {sub.fileName || "View file"}
                                </a>
                              )}
                              {sub.status !== "graded" && (
                                <Dialog
                                  open={gradeOpen === sub.id}
                                  onOpenChange={(open) => setGradeOpen(open ? sub.id : null)}
                                >
                                  <DialogTrigger asChild>
                                    <button
                                      className={cn(buttonVariants({ size: "sm" }), "mt-2 gap-2 text-white shadow-sm hover:shadow-md transition-all")}
                                      style={{ backgroundColor: classColor }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.opacity = "0.9"
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = "1"
                                      }}
                                      type="button"
                                    >
                                      Grade
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden border-0 shadow-2xl">
                                    <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10">
                                      <DialogTitle className="text-xl font-semibold tracking-tight">Grade Submission</DialogTitle>
                                      <DialogDescription className="text-muted-foreground">
                                        Evaluating {sub.student.name}&apos;s work.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <form action={(fd) => handleGrade(sub.id, fd)} className="p-6 space-y-6">
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Score</Label>
                                          <Input
                                            name="grade"
                                            required
                                            type="number"
                                            placeholder={`Out of ${item.points || 100}`}
                                            className="h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-lg font-medium"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Feedback</Label>
                                          <textarea
                                            name="feedback"
                                            placeholder="Provide constructive feedback..."
                                            className="w-full rounded-md border border-muted-foreground/20 bg-muted/20 px-4 py-3 text-sm outline-none focus:bg-background focus:ring-1 focus:ring-primary transition-all resize-none"
                                            rows={4}
                                          />
                                        </div>
                                      </div>

                                      {error && (
                                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
                                          {error}
                                        </div>
                                      )}

                                      <DialogFooter className="pt-2">
                                        <button
                                          type="button"
                                          onClick={() => setGradeOpen(null)}
                                          className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={pending}
                                          className={cn(buttonVariants(), "text-white disabled:opacity-70 shadow-md hover:shadow-lg transition-all min-w-[100px]")}
                                          style={{ backgroundColor: classColor }}
                                          onMouseEnter={(e) => {
                                            if (!pending) e.currentTarget.style.opacity = "0.9"
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.opacity = "1"
                                          }}
                                        >
                                          {pending ? "Grading..." : "Submit Grade"}
                                        </button>
                                      </DialogFooter>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              )}
                              {sub.grade && (
                                <p className="mt-2 text-sm">
                                  Grade: <span className="font-semibold">{sub.grade}</span>
                                  {item.points && ` / ${item.points}`}
                                </p>
                              )}
                              {sub.feedback && (
                                <p className="mt-1 text-sm text-muted-foreground">{sub.feedback}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

