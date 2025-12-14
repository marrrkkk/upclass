"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Calendar,
  FileText,
  Plus,
  Upload,
  CheckCircle,
  Clock,
  MoreVertical,
  AlertCircle,
  FileQuestion,
  File,
  Edit,
  Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClasswork, submitClasswork, gradeSubmission, updateClasswork, deleteClasswork } from "@/app/actions/class-detail"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { AnnouncementSkeleton } from "@/components/skeletons"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"

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
  userId?: string
  userRole: "teacher" | "student" | null
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

  // Edit/Delete state for classwork items
  const [editClassworkOpen, setEditClassworkOpen] = useState<string | null>(null)
  const [deleteClassworkOpen, setDeleteClassworkOpen] = useState<string | null>(null)
  const [editPending, startEditTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    
    if (!navigator.onLine) {
      setError("You're offline. Please check your internet connection and try again.")
      return
    }

    startTransition(async () => {
      const res = await executeWithOfflineHandling(
        () => createClasswork(classId, formData),
        'create-classwork',
        { classId, ...Object.fromEntries(formData.entries()) }
      )

      if (!res.success) {
        setError(res.error || "Failed to create classwork")
        return
      }

      if (res.queued) {
        setError("Action queued. It will be synced when you're back online.")
        setTimeout(() => setCreateOpen(false), 2000)
        return
      }

      setCreateOpen(false)
    })
  }

  const handleSubmit = async (classworkId: string, formData: FormData) => {
    setError(null)
    
    if (!navigator.onLine) {
      setError("You're offline. Please check your internet connection and try again.")
      return
    }

    startTransition(async () => {
      const res = await executeWithOfflineHandling(
        () => submitClasswork(classworkId, formData),
        'submit-classwork',
        { classworkId, ...Object.fromEntries(formData.entries()) }
      )

      if (!res.success) {
        setError(res.error || "Failed to submit classwork")
        return
      }

      if (res.queued) {
        setError("Submission queued. It will be synced when you're back online.")
        setTimeout(() => setSubmitOpen(null), 2000)
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

  const handleEditClasswork = async (classworkId: string, formData: FormData) => {
    startEditTransition(async () => {
      const res = await updateClasswork(classworkId, formData)
      if (res.success) {
        setEditClassworkOpen(null)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  const handleDeleteClasswork = async (classworkId: string) => {
    setDeletingId(classworkId)
    setDeleteClassworkOpen(null)
    startDeleteTransition(async () => {
      const res = await deleteClasswork(classworkId)
      if (res.success) {
        router.refresh()
      } else {
        setError(res.error)
      }
      setDeletingId(null)
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const getSubmissionForClasswork = (classworkId: string) => {
    // For students, only return their own submission
    return submissions.find((s) => s.classworkId === classworkId && s.studentId === userId)
  }

  const getSubmissionsForClasswork = (classworkId: string) => {
    return submissions.filter((s) => s.classworkId === classworkId)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <FileText className="h-5 w-5" />
      case 'quiz': return <FileQuestion className="h-5 w-5" />
      case 'material': return <BookOpen className="h-5 w-5" />
      default: return <File className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Classwork</h2>

        {/* Create Classwork Button (only for teachers) */}
        {userRole === "teacher" && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button
                className={cn(buttonVariants({ size: "sm" }), "gap-2 shadow-sm hover:shadow-md transition-all text-white font-medium")}
                style={{ backgroundColor: classColor }}
              >
                <Plus className="h-4 w-4" />
                Create
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-none shadow-2xl p-0 overflow-y-auto bg-background max-h-[calc(100vh-2rem)] flex flex-col">
              <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  Create Classwork
                </DialogTitle>
                <DialogDescription>
                  Create a new assignment, quiz, or material for your students.
                </DialogDescription>
              </DialogHeader>

              <form action={handleCreateClasswork} className="p-6 space-y-6 flex-1 min-h-0">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="classwork-title" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">Title</Label>
                    <Input
                      id="classwork-title"
                      name="title"
                      required
                      placeholder="e.g. History of Rome Essay"
                      className="h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="classwork-description" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">Description</Label>
                    <Textarea
                      id="classwork-description"
                      name="description"
                      placeholder="Add instructions, guidelines, and other details..."
                      rows={4}
                      className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="classwork-type" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">Type</Label>
                      <select
                        id="classwork-type"
                        name="type"
                        className="flex h-10 w-full rounded-md border border-muted-foreground/20 bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="assignment">Assignment</option>
                        <option value="quiz">Quiz</option>
                        <option value="material">Material</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="classwork-points" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">Points</Label>
                      <Input
                        id="classwork-points"
                        name="points"
                        type="number"
                        placeholder="100"
                        className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="classwork-dueDate" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">Due Date</Label>
                    <Input
                      id="classwork-dueDate"
                      name="dueDate"
                      type="datetime-local"
                      className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
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
                    className={cn(buttonVariants(), "text-white min-w-[100px] shadow-sm")}
                    style={{ backgroundColor: classColor }}
                  >
                    {pending ? "Creating..." : "Create"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Classwork List */}
      {classwork.length === 0 ? (
        <Card className="border-dashed bg-muted/10 border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-medium">No classwork yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              {userRole === "teacher"
                ? "Assignments, quizzes, and materials you create will appear here."
                : "Check back later for new assignments from your teacher."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {classwork.map((item) => {
            if (deletingId === item.id) {
              return <AnnouncementSkeleton key={item.id} />
            }
            const submission = getSubmissionForClasswork(item.id)
            const allSubmissions = getSubmissionsForClasswork(item.id)
            const isDueSoon = item.dueDate && new Date(item.dueDate) > new Date() && new Date(item.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000

            return (
              <Card key={item.id} className="group border-border/60 hover:border-border transition-all hover:shadow-sm overflow-hidden border-l-[6px]" style={{ borderLeftColor: classColor }}>
                <CardHeader className="pl-5 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-1 p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300"
                        style={{ '--primary': classColor } as any}
                      >
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors" style={{ '--primary': classColor } as any}>
                          {item.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {item.points && (
                            <span className="flex items-center gap-1 font-medium bg-muted/50 px-1.5 py-0.5 rounded text-foreground/70">
                              {item.points} pts
                            </span>
                          )}
                          <span className="capitalize">{item.type}</span>
                          <span className="text-muted-foreground/40">•</span>
                          <span>Posted {new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {item.dueDate && (
                      <Badge variant="outline" className={cn(
                        "flex shrink-0 items-center gap-1.5 font-normal px-2.5 py-1",
                        isDueSoon ? "border-amber-200 bg-amber-50 text-amber-700" : "bg-muted/30"
                      )}>
                        <Clock className="h-3.5 w-3.5" />
                        Due {formatDate(item.dueDate)}
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
                          <DropdownMenuItem onClick={() => setEditClassworkOpen(item.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteClassworkOpen(item.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pl-5 pt-0">
                  <div className="ml-[3.25rem] space-y-4">
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2group-hover:line-clamp-none transition-all duration-300 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      {userRole === "student" ? (
                        <>
                          {submission ? (
                            <div className="flex items-center gap-3">
                              <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'} className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1",
                                submission.status === 'graded' ? "bg-green-100 text-green-700 hover:bg-green-100 border-transparent shadow-none" : "",
                                submission.status === 'submitted' ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-transparent" : ""
                              )}>
                                <CheckCircle className="h-3.5 w-3.5" />
                                {submission.status === 'graded' ? 'Graded' : 'Submitted'}
                              </Badge>

                              {submission.grade && (
                                <span className="text-sm font-semibold">
                                  {submission.grade} / {item.points}
                                </span>
                              )}

                              <button
                                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                                onClick={() => setSubmitOpen(item.id)}
                              >
                                View Details
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSubmitOpen(item.id)}
                              className={cn(buttonVariants({ size: "sm" }), "h-8 px-4 font-medium text-xs gap-1.5 text-white shadow-sm")}
                              style={{ backgroundColor: classColor }}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Submit Work
                            </button>
                          )}

                          {/* Student Submission Dialog */}
                          <Dialog open={submitOpen === item.id} onOpenChange={(open) => setSubmitOpen(open ? item.id : null)}>
                            <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-y-auto border-none shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
                              <DialogHeader className="p-6 pb-4 border-b bg-muted/30 shrink-0">
                                <DialogTitle className="text-xl">
                                  {submission ? "Submission Details" : "Submit Assignment"}
                                </DialogTitle>
                                <DialogDescription className="mt-1.5">
                                  {item.title}
                                </DialogDescription>
                              </DialogHeader>

                              {submission && submission.status !== 'new' && (
                                <div className="p-6 pb-0 space-y-4">
                                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                                    <div className="flex-1 space-y-1">
                                      <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={cn(
                                          submission.status === 'graded' ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                        )}>
                                          {submission.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                          on {formatDate(submission.submittedAt)}
                                        </span>
                                      </div>
                                    </div>
                                    {submission.grade && (
                                      <div className="text-right">
                                        <p className="text-2xl font-bold">{submission.grade}</p>
                                        <p className="text-xs text-muted-foreground uppercase font-medium">Out of {item.points}</p>
                                      </div>
                                    )}
                                  </div>

                                  {submission.feedback && (
                                    <div className="space-y-2">
                                      <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Teacher Feedback</Label>
                                      <div className="p-4 rounded-lg bg-blue-50/50 text-blue-900/80 text-sm leading-relaxed border border-blue-100">
                                        {submission.feedback}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <form action={(fd) => handleSubmit(item.id, fd)} className="p-6 space-y-6">
                                {/* Only show input if not graded yet */}
                                {!submission?.grade ? (
                                  <>
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                          {submission ? "Edit Content" : "Your Work"}
                                        </Label>
                                        <Textarea
                                          name="content"
                                          defaultValue={submission?.content || ""}
                                          placeholder="Type your response here..."
                                          className="w-full min-h-[120px] rounded-md border-muted-foreground/20 bg-muted/20 focus-visible:bg-background transition-colors resize-none leading-relaxed"
                                        />
                                      </div>

                                      <div className="grid gap-4">
                                        <div className="space-y-2">
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Attachment</Label>
                                          <div className="grid gap-3">
                                            <Input
                                              name="fileUrl"
                                              type="url"
                                              defaultValue={submission?.fileUrl || ""}
                                              placeholder="Link to file (Google Drive, Dropbox, etc.)"
                                              className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                                            />
                                            <Input
                                              name="fileName"
                                              defaultValue={submission?.fileName || ""}
                                              placeholder="Display name for file (optional)"
                                              className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {error && (
                                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
                                        {error}
                                      </div>
                                    )}

                                    <DialogFooter className="pt-2">
                                      <button
                                        type="button"
                                        onClick={() => setSubmitOpen(null)}
                                        className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
                                      >
                                        Close
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={pending}
                                        className={cn(buttonVariants(), "text-white min-w-[100px] shadow-sm")}
                                        style={{ backgroundColor: classColor }}
                                      >
                                        {pending ? "Submitting..." : (submission ? "Update" : "Submit")}
                                      </button>
                                    </DialogFooter>
                                  </>
                                ) : (
                                  <DialogFooter>
                                    <button
                                      type="button"
                                      onClick={() => setSubmitOpen(null)}
                                      className={cn(buttonVariants({ variant: "outline" }))}
                                    >
                                      Close
                                    </button>
                                  </DialogFooter>
                                )}
                              </form>
                            </DialogContent>
                          </Dialog>
                        </>
                      ) : (
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">{allSubmissions.length} submissions</span>
                            {/* Filter or view all button could go here */}
                          </div>

                          {allSubmissions.length > 0 ? (
                            <div className="space-y-2 mt-3">
                              {allSubmissions.slice(0, 3).map(sub => (
                                <div key={sub.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border text-sm group/sub hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => setGradeOpen(sub.id)}>
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-semibold overflow-hidden">
                                      {sub.student.image ? (
                                        <img src={sub.student.image} alt={sub.student.name} className="h-full w-full object-cover" />
                                      ) : sub.student.name[0]}
                                    </div>
                                    <span className="font-medium">{sub.student.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {sub.grade ? (
                                      <span className="font-semibold text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{sub.grade}/{item.points}</span>
                                    ) : (
                                      <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">Needs Grading</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {allSubmissions.length > 3 && (
                                <p className="text-xs text-muted-foreground text-center pt-1">
                                  + {allSubmissions.length - 3} more submissions
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-muted/20 border border-dashed text-center">
                              <p className="text-xs text-muted-foreground">No students have submitted work yet.</p>
                            </div>
                          )}

                          {/* Grading Dialog */}
                          <Dialog open={!!gradeOpen} onOpenChange={(open) => !open && setGradeOpen(null)}>
                            {(() => {
                              const gradingSub = allSubmissions.find(s => s.id === gradeOpen)
                              if (!gradingSub) return null

                              return (
                                <DialogContent className="sm:max-w-[600px] gap-0 p-0 border-none shadow-2xl">
                                  <DialogHeader className="p-6 border-b bg-muted/30">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <DialogTitle className="text-lg">Grading</DialogTitle>
                                        <DialogDescription className="mt-1">
                                          {item.title}
                                        </DialogDescription>
                                      </div>
                                      <div className="flex items-center gap-2 pr-4">
                                        <div className="h-8 w-8 rounded-full bg-muted-foreground/10 flex items-center justify-center overflow-hidden">
                                          {gradingSub.student.image ? (
                                            <img src={gradingSub.student.image} alt={gradingSub.student.name} className="h-full w-full object-cover" />
                                          ) : (
                                            <span className="text-xs font-bold">{gradingSub.student.name[0]}</span>
                                          )}
                                        </div>
                                        <span className="font-medium text-sm">{gradingSub.student.name}</span>
                                      </div>
                                    </div>
                                  </DialogHeader>

                                  <div className="p-6 space-y-6">
                                    {/* Student Content Display */}
                                    <div className="space-y-2">
                                      <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Student Submission</Label>
                                      <div className="p-4 rounded-lg bg-muted/30 border text-sm min-h-[80px]">
                                        {gradingSub.content ? (
                                          <p className="whitespace-pre-wrap leading-relaxed">{gradingSub.content}</p>
                                        ) : (
                                          <p className="text-muted-foreground italic">No text content submitted.</p>
                                        )}

                                        {gradingSub.fileUrl && (
                                          <div className="mt-4 pt-4 border-t flex items-center gap-2">
                                            <a
                                              href={gradingSub.fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 text-primary hover:underline bg-background p-2 rounded border shadow-sm transition-colors"
                                            >
                                              <File className="h-4 w-4" />
                                              <span className="font-medium">{gradingSub.fileName || "Attached File"}</span>
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <form action={(fd) => handleGrade(gradingSub.id, fd)} className="space-y-6 pt-2">
                                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                        <div className="space-y-2">
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Grade</Label>
                                          <div className="relative">
                                            <Input
                                              name="grade"
                                              required
                                              type="number"
                                              defaultValue={gradingSub.grade || ""}
                                              placeholder="0"
                                              className="h-11 text-lg font-medium bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors pr-12"
                                            />
                                            <span className="absolute right-3 top-3 text-sm text-muted-foreground">
                                              / {item.points}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="space-y-2 sm:col-span-2">
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Feedback</Label>
                                          <Textarea
                                            name="feedback"
                                            defaultValue={gradingSub.feedback || ""}
                                            placeholder="Write feedback for the student..."
                                            rows={3}
                                            className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                                          />
                                        </div>
                                      </div>

                                      {error && (
                                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
                                          {error}
                                        </div>
                                      )}

                                      <DialogFooter>
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
                                          className={cn(buttonVariants(), "text-white shadow-sm")}
                                          style={{ backgroundColor: classColor }}
                                        >
                                          {pending ? "Saving..." : "Save Grade"}
                                        </button>
                                      </DialogFooter>
                                    </form>
                                  </div>
                                </DialogContent>
                              )
                            })()}
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Classwork Dialog */}
      {editClassworkOpen && (() => {
        const item = classwork.find(c => c.id === editClassworkOpen)
        if (!item) return null
        return (
          <Dialog open={!!editClassworkOpen} onOpenChange={(open) => !open && setEditClassworkOpen(null)}>
            <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
              <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 border-b border-border/50">
                <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Edit className="h-5 w-5" />
                  </div>
                  Edit Classwork
                </DialogTitle>
              </DialogHeader>
              <form action={(fd) => handleEditClasswork(item.id, fd)} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input id="edit-title" name="title" defaultValue={item.title} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea id="edit-description" name="description" defaultValue={item.description || ""} className="min-h-[100px] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-dueDate">Due Date</Label>
                    <Input id="edit-dueDate" name="dueDate" type="datetime-local" defaultValue={item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 16) : ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-points">Points</Label>
                    <Input id="edit-points" name="points" type="number" defaultValue={item.points || ""} />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <button type="button" onClick={() => setEditClassworkOpen(null)} className={cn(buttonVariants({ variant: "ghost" }))}>
                    Cancel
                  </button>
                  <button type="submit" disabled={editPending} className={cn(buttonVariants(), "min-w-[100px]")} style={{ backgroundColor: classColor }}>
                    {editPending ? "Saving..." : "Save"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Delete Classwork Dialog */}
      {deleteClassworkOpen && (() => {
        const item = classwork.find(c => c.id === deleteClassworkOpen)
        if (!item) return null
        return (
          <Dialog open={!!deleteClassworkOpen} onOpenChange={(open) => !open && setDeleteClassworkOpen(null)}>
            <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)]">
              <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border-b border-destructive/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold">Delete Classwork</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      This action cannot be undone
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this classwork?
                </p>
                <p className="text-lg font-semibold text-foreground truncate">
                  "{item.title}"
                </p>
                <p className="text-xs text-muted-foreground">
                  All student submissions will also be deleted.
                </p>
              </div>

              <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-center gap-3">
                <button type="button" onClick={() => setDeleteClassworkOpen(null)} disabled={deletePending} className={cn(buttonVariants({ variant: "outline" }), "min-w-[100px]")}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleDeleteClasswork(item.id)} disabled={deletePending} className={cn(buttonVariants({ variant: "destructive" }), "min-w-[120px] gap-2")}>
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
