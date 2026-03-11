"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [editClassworkOpen, setEditClassworkOpen] = useState<string | null>(null)
  const [deleteClassworkOpen, setDeleteClassworkOpen] = useState<string | null>(null)
  const [editPending, startEditTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useClassworkRealtime({ classId, classwork, router, userId, userRole })

  const handleCreateClasswork = async (formData: FormData) => {
    setError(null)

    if (!navigator.onLine) {
      setError("You're offline. Please check your internet connection and try again.")
      return
    }

    startTransition(async () => {
      const result = await executeWithOfflineHandling(
        () => createClasswork(classId, formData),
        "create-classwork",
        { classId, ...Object.fromEntries(formData.entries()) },
      )

      if (!result.success) {
        setError(result.error || "Failed to create classwork")
        return
      }

      if (result.queued) {
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
      const result = await executeWithOfflineHandling(
        () => submitClasswork(classworkId, formData),
        "submit-classwork",
        { classworkId, ...Object.fromEntries(formData.entries()) },
      )

      if (!result.success) {
        setError(result.error || "Failed to submit classwork")
        return
      }

      if (result.queued) {
        setError("Submission queued. It will be synced when you're back online.")
      }
    })
  }

  const handleGrade = async (submissionId: string, formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await gradeSubmission(submissionId, formData)
      if (!result.success) {
        setError(result.error)
      }
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
      router.refresh()
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

      router.refresh()
      setDeletingId(null)
    })
  }

  const getSubmissionForClasswork = (classworkId: string) =>
    submissions.find((submission) => submission.classworkId === classworkId && submission.studentId === userId)

  const getSubmissionsForClasswork = (classworkId: string) =>
    submissions.filter((submission) => submission.classworkId === classworkId)

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
          {classwork.map((item) => (
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
        const item = classwork.find((entry) => entry.id === editClassworkOpen)
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
        const item = classwork.find((entry) => entry.id === deleteClassworkOpen)
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
