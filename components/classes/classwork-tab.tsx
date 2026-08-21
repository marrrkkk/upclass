"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpen, Edit, Trash2 } from "lucide-react"

import {
  createClasswork,
  deleteClasswork,
  gradeSubmission,
  submitClasswork,
  updateClasswork,
} from "@/app/actions/class-detail"
import { ClassworkCard } from "@/components/classes/classwork-card"
import { ClassworkCreateDialog } from "@/components/classes/classwork-create-dialog"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, FieldLabel, FieldRow } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { Panel } from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { useClassworkRealtime } from "@/hooks/classes/use-classwork-realtime"
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"
import type { ClassworkData, SubmissionData } from "@/types/classes"

type ClassworkTabProps = {
  classId: string
  userId?: string
  userRole: "teacher" | "student" | null
  classwork: ClassworkData[]
  submissions: SubmissionData[]
  classColor: string
}

/** Client-only marker for classwork that exists only in this local list. */
type ClassworkItem = ClassworkData & { tempId?: string; pending?: boolean }

export function ClassworkTab({ classId, userId, userRole, classwork, submissions, classColor }: ClassworkTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [classworkItems, setClassworkItems] = useState<ClassworkItem[]>(classwork)
  const [submissionItems, setSubmissionItems] = useState(submissions)
  const [createOpen, setCreateOpen] = useState(
    () => userRole === "teacher" && searchParams?.get("create") === "1",
  )
  const [error, setError] = useState<string | null>(null)
  const [submissionPending, startSubmissionTransition] = useTransition()
  const [editClassworkOpen, setEditClassworkOpen] = useState<string | null>(null)
  const [deleteClassworkOpen, setDeleteClassworkOpen] = useState<string | null>(null)
  const { mutate, pending } = useOptimisticMutation<ClassworkItem[]>(classworkItems, setClassworkItems)

  useEffect(() => {
    setClassworkItems(classwork)
  }, [classwork])

  useEffect(() => {
    setSubmissionItems(submissions)
  }, [submissions])

  useClassworkRealtime({
    classId,
    classwork,
    router,
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

  const handleCreateClasswork = (formData: FormData) => {
    setError(null)

    const title = String(formData.get("title") || "").trim()
    const type =
      String(formData.get("type") || "") === "material" ||
      String(formData.get("type") || "") === "quiz"
        ? (String(formData.get("type")) as "material" | "quiz")
        : "assignment"
    const tempId = `classwork-${crypto.randomUUID()}`
    const optimisticItem: ClassworkItem = {
      id: tempId,
      tempId,
      pending: true,
      title,
      description: String(formData.get("description") || "") || null,
      type,
      dueDate: String(formData.get("dueDate") || "") || null,
      points: String(formData.get("points") || "") || null,
      createdAt: new Date().toISOString(),
    }

    void mutate(
      (previous) => [optimisticItem, ...previous],
      () => createClasswork(classId, formData),
      {
        offline: {
          type: "create-classwork",
          payload: {
            classId,
            title,
            description: optimisticItem.description ?? "",
            type,
            dueDate: optimisticItem.dueDate ?? "",
            points: optimisticItem.points ?? "",
            tempId,
          },
        },
        queued: {
          tempId,
          remove: (current) => current.filter((item) => item.tempId !== tempId),
        },
        onSuccess: (_result, current) => {
          // Classwork returns no ID, so drop the placeholder and let the
          // server refresh/realtime bring in the real row.
          setCreateOpen(false)
          router.refresh()
          return current.filter((item) => item.tempId !== tempId)
        },
        onError: (_message, current) => current.filter((item) => item.tempId !== tempId),
      },
    )

    // The optimistic item is already in the list: close immediately.
    setCreateOpen(false)
  }

  const handleSubmit = async (classworkId: string, formData: FormData) => {
    setError(null)

    startSubmissionTransition(async () => {
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

      router.refresh()
    })
  }

  const handleGrade = async (submissionId: string, formData: FormData) => {
    setError(null)
    startSubmissionTransition(async () => {
      const result = await gradeSubmission(submissionId, formData)
      if (!result.success) {
        setError(result.error)
        return
      }

      router.refresh()
    })
  }

  const handleEditClasswork = (classworkId: string, formData: FormData) => {
    setError(null)

    void mutate(
      (previous) =>
        previous.map((item) =>
          item.id === classworkId
            ? {
                ...item,
                title: String(formData.get("title") || "").trim(),
                description: String(formData.get("description") || "") || null,
                dueDate: String(formData.get("dueDate") || "") || null,
                points: String(formData.get("points") || "") || null,
              }
            : item,
        ),
      () => updateClasswork(classworkId, formData),
      {
        onSuccess: (_result, current) => {
          setEditClassworkOpen(null)
          router.refresh()
          return current
        },
      },
    )
  }

  const handleDeleteClasswork = (classworkId: string) => {
    setDeleteClassworkOpen(null)

    void mutate(
      (previous) => previous.filter((item) => item.id !== classworkId),
      () => deleteClasswork(classworkId),
      {
        onSuccess: (_result, current) => {
          router.refresh()
          return current
        },
      },
    )
  }

  const getSubmissionForClasswork = (classworkId: string) =>
    submissionItems.find((submission) => submission.classworkId === classworkId && submission.studentId === userId)

  const getSubmissionsForClasswork = (classworkId: string) =>
    submissionItems.filter((submission) => submission.classworkId === classworkId)

  return (
    <section className="space-y-4">
      {userRole === "teacher" ? (
        <div className="flex justify-end">
          <ClassworkCreateDialog
            classColor={classColor}
            error={error}
            open={createOpen}
            pending={pending}
            onOpenChange={setCreateOpen}
            onSubmit={handleCreateClasswork}
          />
        </div>
      ) : null}

      {classworkItems.length === 0 ? (
        <Panel padding="none">
          <EmptyState
            icon={<BookOpen />}
            title="No classwork yet"
            description={
              userRole === "teacher"
                ? "Assignments, quizzes, and materials you create will appear here."
                : "Check back later for new assignments from your teacher."
            }
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {classworkItems.map((item) => (
            <ClassworkCard
              key={item.id}
              allSubmissions={getSubmissionsForClasswork(item.id)}
              classColor={classColor}
              classId={classId}
              deleting={false}
              error={error}
              item={item}
              pending={submissionPending}
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
          <ResponsiveOverlay
            open={!!editClassworkOpen}
            onOpenChange={(open) => !open && setEditClassworkOpen(null)}
            title={
              <span className="flex items-center gap-2">
                <IconBadge tone="primary" size="sm"><Edit /></IconBadge>
                Edit classwork
              </span>
            }
            description="Update the assignment details shown to students."
            desktopClassName="sm:max-w-[34rem]"
            footer={
              <>
                <Button type="button" variant="ghost" onClick={() => setEditClassworkOpen(null)}>Cancel</Button>
                <Button type="submit" form="edit-classwork-form" isLoading={pending} disabled={pending}>
                  Save
                </Button>
              </>
            }
          >
            <form id="edit-classwork-form" action={(formData) => handleEditClasswork(item.id, formData)} className="space-y-5">
              <Field>
                <FieldLabel htmlFor="edit-title">Title</FieldLabel>
                <Input id="edit-title" name="title" defaultValue={item.title} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-description" optional>Description</FieldLabel>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={item.description || ""}
                  className="min-h-24 resize-none"
                />
              </Field>
              <FieldRow>
                <Field>
                  <FieldLabel htmlFor="edit-dueDate" optional>Due date</FieldLabel>
                  <Input
                    id="edit-dueDate"
                    name="dueDate"
                    type="datetime-local"
                    defaultValue={item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 16) : ""}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-points" optional>Points</FieldLabel>
                  <Input id="edit-points" name="points" type="number" defaultValue={item.points || ""} />
                </Field>
              </FieldRow>
            </form>
          </ResponsiveOverlay>
        )
      })()}

      {deleteClassworkOpen && (() => {
        const item = classworkItems.find((entry) => entry.id === deleteClassworkOpen)
        if (!item) return null

        return (
          <AlertDialog
            open={!!deleteClassworkOpen}
            onOpenChange={(open) => !open && setDeleteClassworkOpen(null)}
          >
            <AlertDialogContent className="sm:max-w-[26rem]">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <IconBadge tone="danger" size="sm"><Trash2 /></IconBadge>
                  Delete classwork
                </AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <Callout tone="danger" icon={false}>
                <Text variant="small">
                  Delete &ldquo;{item.title}&rdquo; and all associated student submissions?
                </Text>
              </Callout>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => handleDeleteClasswork(item.id)}
                  disabled={pending}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}
    </section>
  )
}
