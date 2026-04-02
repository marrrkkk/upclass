"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, useTransition } from "react"
import { BookOpen, Edit, Trash2 } from "lucide-react"

import { createClasswork, deleteClasswork, gradeSubmission, submitClasswork, updateClasswork } from "@/app/actions/class-detail"
import { ClassworkCard } from "@/components/classes/classwork-card"
import { ClassworkCreateDialog } from "@/components/classes/classwork-create-dialog"
import { useClassworkRealtime } from "@/hooks/classes/use-classwork-realtime"
import type { ClassworkData, SubmissionData } from "@/types/classes"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"
import { invalidateClassDetailCollections } from "@/lib/query-invalidation"
import { cn } from "@/lib/utils"

type ClassworkTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  classColor: string
}

export function ClassworkTab({ classId, userId, userRole, classwork, submissions, classColor }: ClassworkTabProps) {
  const queryClient = useQueryClient()
  const [classworkItems, setClassworkItems] = useState(classwork)
  const [submissionItems, setSubmissionItems] = useState(submissions)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [editClassworkOpen, setEditClassworkOpen] = useState<string | null>(null)
  const [deleteClassworkOpen, setDeleteClassworkOpen] = useState<string | null>(null)
  const [editPending, startEditTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setClassworkItems(classwork)
  }, [classwork])

  useEffect(() => {
    setSubmissionItems(submissions)
  }, [submissions])

  useClassworkRealtime({
    classId,
    classwork,
    onUnhandledChange: () => {
      void invalidateClassDetailCollections(queryClient, { classId, userId })
    },
    userId,
    userRole,
    onClassworkPayload: (payload) => {
      const nextRecord = payload.new as
        | {
            id?: string
            title?: string
            description?: string | null
            type?: string
            due_date?: string | null
            points?: string | null
          }
        | null
      const prevRecord = payload.old as { id?: string } | null

      if (payload.eventType === "UPDATE" && nextRecord?.id) {
        setClassworkItems((current) =>
          current.map((item) =>
            item.id === nextRecord.id
              ? {
                  ...item,
                  title: nextRecord.title ?? item.title,
                  description: nextRecord.description ?? item.description,
                  type: nextRecord.type ?? item.type,
                  dueDate: nextRecord.due_date ?? item.dueDate,
                  points: nextRecord.points ?? item.points,
                }
              : item,
          ),
        )
        return true
      }

      if (payload.eventType === "DELETE" && prevRecord?.id) {
        setClassworkItems((current) => current.filter((item) => item.id !== prevRecord.id))
        setSubmissionItems((current) =>
          current.filter((submission) => submission.classworkId !== prevRecord.id),
        )
        return true
      }

      return false
    },
    onSubmissionPayload: (payload) => {
      const nextRecord = payload.new as
        | {
            id?: string
            content?: string | null
            file_url?: string | null
            file_name?: string | null
            status?: string
            grade?: string | null
            feedback?: string | null
            submitted_at?: string | null
            graded_at?: string | null
          }
        | null
      const prevRecord = payload.old as { id?: string } | null

      if (payload.eventType === "UPDATE" && nextRecord?.id) {
        setSubmissionItems((current) =>
          current.map((submission) =>
            submission.id === nextRecord.id
              ? {
                  ...submission,
                  content: nextRecord.content ?? submission.content,
                  fileUrl: nextRecord.file_url ?? submission.fileUrl,
                  fileName: nextRecord.file_name ?? submission.fileName,
                  status: nextRecord.status ?? submission.status,
                  grade: nextRecord.grade ?? submission.grade,
                  feedback: nextRecord.feedback ?? submission.feedback,
                  submittedAt: nextRecord.submitted_at ?? submission.submittedAt,
                  gradedAt: nextRecord.graded_at ?? submission.gradedAt,
                }
              : submission,
          ),
        )
        return true
      }

      if (payload.eventType === "DELETE" && prevRecord?.id) {
        setSubmissionItems((current) =>
          current.filter((submission) => submission.id !== prevRecord.id),
        )
        return true
      }

      return false
    },
  })

  const handleCreateClasswork = async (formData: FormData) => {
    setError(null)

    startTransition(async () => {
      const result = await executeWithOfflineHandling(
        () => createClasswork(classId, formData),
        "create-classwork",
        {
          classId,
          title: String(formData.get("title") || ""),
          description: String(formData.get("description") || ""),
          type:
            String(formData.get("type") || "") === "material" ||
            String(formData.get("type") || "") === "quiz"
              ? (String(formData.get("type")) as "material" | "quiz")
              : "assignment",
          dueDate: String(formData.get("dueDate") || ""),
          points: String(formData.get("points") || ""),
        },
      )

      if (result.queued) {
        setError("Action queued. It will be synced when you're back online.")
        setTimeout(() => setCreateOpen(false), 2000)
        return
      }

      if (!result.success) {
        setError(result.error || "Failed to create classwork")
        return
      }

      setCreateOpen(false)
    })
  }

  const handleSubmit = async (classworkId: string, formData: FormData) => {
    setError(null)

    startTransition(async () => {
      const result = await executeWithOfflineHandling(
        () => submitClasswork(classworkId, formData),
        "submit-classwork",
        {
          classworkId,
          content: String(formData.get("content") || ""),
          attachments: JSON.parse(String(formData.get("attachments") || "[]")),
          mode: String(formData.get("mode") || "submit") === "draft" ? "draft" : "submit",
        },
      )

      if (result.queued) {
        setError("Submission queued. It will be synced when you're back online.")
        return
      }

      if (!result.success) {
        setError(result.error || "Failed to submit classwork")
        return
      }

      await invalidateClassDetailCollections(queryClient, { classId, userId })
    })
  }

  const handleGrade = async (submissionId: string, formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await gradeSubmission(submissionId, formData)
      if (!result.success) {
        setError(result.error)
        return
      }

      await invalidateClassDetailCollections(queryClient, { classId, userId })
    })
  }

  const handleEditClasswork = async (classworkId: string, formData: FormData) => {
    startEditTransition(async () => {
      const result = await updateClasswork(classworkId, formData)
      if (!result.success) {
        setError(result.error)
        return
      }

      setEditClassworkOpen(null)
      await invalidateClassDetailCollections(queryClient, { classId, userId })
    })
  }

  const handleDeleteClasswork = async (classworkId: string) => {
    setDeletingId(classworkId)
    setDeleteClassworkOpen(null)
    startDeleteTransition(async () => {
      const result = await deleteClasswork(classworkId)
      if (!result.success) {
        setError(result.error)
        setDeletingId(null)
        return
      }

      await invalidateClassDetailCollections(queryClient, { classId, userId })
      setDeletingId(null)
    })
  }

  const getSubmissionForClasswork = (classworkId: string) =>
    submissionItems.find((submission) => submission.classworkId === classworkId && submission.studentId === userId)

  const getSubmissionsForClasswork = (classworkId: string) =>
    submissionItems.filter((submission) => submission.classworkId === classworkId)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Classwork</h2>

        {userRole === "teacher" && (
          <ClassworkCreateDialog
            classColor={classColor}
            error={error}
            open={createOpen}
            pending={pending}
            onOpenChange={setCreateOpen}
            onSubmit={handleCreateClasswork}
          />
        )}
      </div>

      {classworkItems.length === 0 ? (
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
          {classworkItems.map((item) => (
            <ClassworkCard
              key={item.id}
              allSubmissions={getSubmissionsForClasswork(item.id)}
              classColor={classColor}
              deleting={deletingId === item.id}
              error={error}
              item={item}
              pending={pending}
              submission={getSubmissionForClasswork(item.id)}
              userRole={userRole}
              onDelete={() => setDeleteClassworkOpen(item.id)}
              onEdit={() => setEditClassworkOpen(item.id)}
              onGrade={handleGrade}
              onSubmit={(formData) => handleSubmit(item.id, formData)}
            />
          ))}
        </div>
      )}

      {editClassworkOpen && (() => {
        const item = classworkItems.find((entry) => entry.id === editClassworkOpen)
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
              <form action={(formData) => handleEditClasswork(item.id, formData)} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input id="edit-title" name="title" defaultValue={item.title} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={item.description || ""}
                    className="min-h-[100px] resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-dueDate">Due Date</Label>
                    <Input
                      id="edit-dueDate"
                      name="dueDate"
                      type="datetime-local"
                      defaultValue={item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 16) : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-points">Points</Label>
                    <Input id="edit-points" name="points" type="number" defaultValue={item.points || ""} />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <button
                    type="button"
                    onClick={() => setEditClassworkOpen(null)}
                    className={cn(buttonVariants({ variant: "ghost" }))}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editPending}
                    className={cn(buttonVariants(), "min-w-[100px]")}
                    style={{ backgroundColor: classColor }}
                  >
                    {editPending ? "Saving..." : "Save"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )
      })()}

      {deleteClassworkOpen && (() => {
        const item = classworkItems.find((entry) => entry.id === deleteClassworkOpen)
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
                <p className="text-sm text-muted-foreground">Are you sure you want to delete this classwork?</p>
                <p className="text-lg font-semibold text-foreground truncate">&quot;{item.title}&quot;</p>
                <p className="text-xs text-muted-foreground">All student submissions will also be deleted.</p>
              </div>

              <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteClassworkOpen(null)}
                  disabled={deletePending}
                  className={cn(buttonVariants({ variant: "outline" }), "min-w-[100px]")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClasswork(item.id)}
                  disabled={deletePending}
                  className={cn(buttonVariants({ variant: "destructive" }), "min-w-[120px] gap-2")}
                >
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
