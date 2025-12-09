"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Calendar, FileText, Plus, Upload } from "lucide-react"
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
}

export function ClassworkTab({ classId, userId, userRole, classwork, submissions }: ClassworkTabProps) {
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
            const submissionClassworkId = payload.new?.classwork_id || payload.old?.classwork_id
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
      supabase.removeChannel(classworkChannel)
      supabase.removeChannel(submissionsChannel)
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
              className={cn(buttonVariants({ size: "sm" }), "w-fit gap-2 bg-blue-600 hover:bg-blue-700")}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Create classwork
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Classwork</DialogTitle>
              <DialogDescription>
                Create an assignment, quiz, or material for your students.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreateClasswork} className="space-y-4">
              <label className="space-y-2 text-sm font-medium text-foreground">
                <span>Title</span>
                <input
                  name="title"
                  required
                  placeholder="e.g. Chapter 5 Quiz"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-foreground">
                <span>Description</span>
                <textarea
                  name="description"
                  placeholder="Add instructions or details..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  rows={3}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-foreground">
                  <span>Type</span>
                  <select
                    name="type"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="material">Material</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-foreground">
                  <span>Points</span>
                  <input
                    name="points"
                    type="number"
                    placeholder="e.g. 100"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm font-medium text-foreground">
                <span>Due Date</span>
                <input
                  name="dueDate"
                  type="datetime-local"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(buttonVariants(), "bg-blue-600 hover:bg-blue-700 disabled:opacity-70")}
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
                              className={cn(buttonVariants({ size: "sm" }), "gap-2 bg-blue-600 hover:bg-blue-700")}
                              type="button"
                            >
                              <Upload className="h-4 w-4" />
                              Submit
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Submit {item.title}</DialogTitle>
                              <DialogDescription>
                                Submit your work for this assignment.
                              </DialogDescription>
                            </DialogHeader>
                            <form action={(fd) => handleSubmit(item.id, fd)} className="space-y-4">
                              <label className="space-y-2 text-sm font-medium text-foreground">
                                <span>Content</span>
                                <textarea
                                  name="content"
                                  placeholder="Write your submission here..."
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                                  rows={5}
                                />
                              </label>
                              <label className="space-y-2 text-sm font-medium text-foreground">
                                <span>File URL (optional)</span>
                                <input
                                  name="fileUrl"
                                  type="url"
                                  placeholder="https://..."
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                                />
                              </label>
                              <label className="space-y-2 text-sm font-medium text-foreground">
                                <span>File Name (optional)</span>
                                <input
                                  name="fileName"
                                  placeholder="submission.pdf"
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                                />
                              </label>
                              {error && <p className="text-sm text-destructive">{error}</p>}
                              <DialogFooter>
                                <button
                                  type="button"
                                  onClick={() => setSubmitOpen(null)}
                                  className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={pending}
                                  className={cn(buttonVariants(), "bg-blue-600 hover:bg-blue-700 disabled:opacity-70")}
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
                                      className={cn(buttonVariants({ size: "sm" }), "mt-2 gap-2 bg-blue-600 hover:bg-blue-700")}
                                      type="button"
                                    >
                                      Grade
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                      <DialogTitle>Grade Submission</DialogTitle>
                                      <DialogDescription>
                                        Grade {sub.student.name}'s submission.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <form action={(fd) => handleGrade(sub.id, fd)} className="space-y-4">
                                      <label className="space-y-2 text-sm font-medium text-foreground">
                                        <span>Grade</span>
                                        <input
                                          name="grade"
                                          required
                                          placeholder="e.g. 85"
                                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                                        />
                                      </label>
                                      <label className="space-y-2 text-sm font-medium text-foreground">
                                        <span>Feedback</span>
                                        <textarea
                                          name="feedback"
                                          placeholder="Add feedback..."
                                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                                          rows={4}
                                        />
                                      </label>
                                      {error && <p className="text-sm text-destructive">{error}</p>}
                                      <DialogFooter>
                                        <button
                                          type="button"
                                          onClick={() => setGradeOpen(null)}
                                          className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={pending}
                                          className={cn(buttonVariants(), "bg-blue-600 hover:bg-blue-700 disabled:opacity-70")}
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

