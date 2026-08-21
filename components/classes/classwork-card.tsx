"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  CheckCircle,
  Clock,
  Edit,
  File,
  FileQuestion,
  FileText,
  GraduationCap,
  MoreVertical,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { ClassworkCardSkeleton } from "@/components/skeletons"
import { ClassworkGradingDialog } from "@/components/classes/classwork-grading-dialog"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Field, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { useSupabaseUpload } from "@/lib/supabase-storage"
import type { ClassworkData, SubmissionData } from "@/types/classes"

type ClassworkCardProps = {
  allSubmissions: SubmissionData[]
  classColor: string
  classId: string
  deleting: boolean
  error: string | null
  /** Display data; may carry client-only optimistic markers. */
  item: ClassworkData & { tempId?: string; pending?: boolean }
  pending: boolean
  submission?: SubmissionData
  userRole: "teacher" | "student" | null
  onDelete: () => void
  onEdit: () => void
  onGrade: (submissionId: string, formData: FormData) => void
  onSubmit: (formData: FormData) => void | Promise<void>
}

type PendingAttachment = {
  fileUrl: string
  fileName: string
  fileType?: string | null
  fileSize?: string | null
}

function formatDate(dateString: string | null) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getTypeIcon(type: string) {
  switch (type) {
    case "assignment":
      return <FileText />
    case "quiz":
      return <FileQuestion />
    case "material":
      return <BookOpen />
    default:
      return <File />
  }
}

function submissionTone(status: SubmissionData["status"]) {
  if (status === "graded") return "success" as const
  if (status === "draft") return "warning" as const
  return "info" as const
}

export function ClassworkCard({
  allSubmissions,
  classId,
  deleting,
  error,
  item,
  pending,
  submission,
  userRole,
  onDelete,
  onEdit,
  onGrade,
  onSubmit,
}: ClassworkCardProps) {
  const organizationPath = useOrganizationPath()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [gradeOpen, setGradeOpen] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkName, setLinkName] = useState("")
  const [uploadedAttachments, setUploadedAttachments] = useState<PendingAttachment[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitMode, setSubmitMode] = useState<"draft" | "submit">("submit")
  const { startUpload, isUploading } = useSupabaseUpload("media")

  const isDueSoon =
    item.dueDate &&
    new Date(item.dueDate) > new Date() &&
    new Date(item.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000

  const gradedCount = allSubmissions.filter((entry) => entry.status === "graded").length
  const ungradedSubmissions = allSubmissions.filter((entry) => entry.status !== "graded")
  const gradingSubmission = allSubmissions.find((entry) => entry.id === gradeOpen) ?? null
  const gradebookHref = organizationPath(`/classes/${classId}?tab=gradebook`)

  const openSubmissionDialog = () => {
    setUploadedAttachments(submission?.attachments ?? [])
    const firstLegacyAttachment = submission?.attachments[0]
    setLinkUrl(firstLegacyAttachment?.fileUrl ?? submission?.fileUrl ?? "")
    setLinkName(firstLegacyAttachment?.fileName ?? submission?.fileName ?? "")
    setSelectedFiles([])
    setLocalError(null)
    setSubmitOpen(true)
  }

  const removeUploadedAttachment = (index: number) => {
    setUploadedAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleAttachmentSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    setSelectedFiles((current) => [...current, ...files].slice(0, 5))
    setLocalError(null)
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  if (deleting) {
    return <ClassworkCardSkeleton />
  }

  return (
    <Panel padding="none" className="overflow-hidden">
      <PanelHeader className="items-start">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge tone="neutral" size="md">{getTypeIcon(item.type)}</IconBadge>
          <PanelHeading>
            <PanelTitle>{item.title}</PanelTitle>
            <PanelDescription>
              <span className="capitalize">{item.type}</span>
              {item.points ? ` · ${item.points} points` : ""}
              {` · Posted ${new Date(item.createdAt).toLocaleDateString()}`}
            </PanelDescription>
          </PanelHeading>
        </div>

        <PanelActions className="flex-wrap justify-end">
          {item.tempId && item.pending ? (
            <StatusBadge tone="info">
              <span className="size-2 animate-pulse rounded-full bg-current" aria-hidden="true" />
              Creating…
            </StatusBadge>
          ) : null}

          {item.dueDate ? (
            <StatusBadge tone={isDueSoon ? "warning" : "neutral"} dot={!!isDueSoon}>
              <Clock aria-hidden="true" />
              Due {formatDate(item.dueDate)}
            </StatusBadge>
          ) : null}

          {userRole === "teacher" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${item.title}`}>
                  <MoreVertical aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </PanelActions>
      </PanelHeader>

      <PanelBody className="space-y-4">
        {item.description ? (
          <Text variant="small" tone="muted" className="max-w-[70ch] whitespace-pre-wrap">
            {item.description}
          </Text>
        ) : null}

        {userRole === "student" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            {submission ? (
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone={submissionTone(submission.status)} dot>
                  <CheckCircle aria-hidden="true" />
                  {submission.status === "graded"
                    ? "Graded"
                    : submission.status === "draft"
                      ? "Draft"
                      : "Submitted"}
                </StatusBadge>
                {submission.grade ? (
                  <Text variant="small" className="numeric-tabular">
                    {submission.grade} / {item.points}
                  </Text>
                ) : null}
                <Button type="button" variant="link" size="sm" onClick={openSubmissionDialog}>
                  {submission.status === "draft" ? "Continue draft" : "View details"}
                </Button>
              </div>
            ) : (
              <Button type="button" size="sm" onClick={openSubmissionDialog}>
                <Upload aria-hidden="true" />
                Start work
              </Button>
            )}

            <ResponsiveOverlay
              open={submitOpen}
              onOpenChange={setSubmitOpen}
              title={submission ? "Submission workspace" : "Submit assignment"}
              description={item.title}
              desktopClassName="sm:max-w-[42rem]"
              footer={
                <>
                  <Button type="button" variant="ghost" onClick={() => setSubmitOpen(false)}>Close</Button>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="submit"
                      form="classwork-submit-form"
                      variant="outline"
                      isLoading={pending || isUploading}
                      disabled={pending || isUploading}
                      onClick={() => setSubmitMode("draft")}
                    >
                      <Save aria-hidden="true" />
                      Save draft
                    </Button>
                    <Button
                      type="submit"
                      form="classwork-submit-form"
                      isLoading={pending || isUploading}
                      disabled={pending || isUploading}
                      onClick={() => setSubmitMode("submit")}
                    >
                      <Upload aria-hidden="true" />
                      {submission?.status === "graded" || submission?.status === "submitted"
                        ? "Resubmit"
                        : "Submit"}
                    </Button>
                  </div>
                </>
              }
            >
              <form
                id="classwork-submit-form"
                action={async (formData) => {
                  setLocalError(null)

                  let nextAttachments = [...uploadedAttachments]
                  const manualAttachments: PendingAttachment[] = []
                  if (linkUrl.trim() && linkName.trim()) {
                    manualAttachments.push({
                      fileUrl: linkUrl.trim(),
                      fileName: linkName.trim(),
                      fileType: null,
                      fileSize: null,
                    })
                  }

                  if (selectedFiles.length > 0) {
                    try {
                      const uploads = await startUpload(selectedFiles)
                      if (!uploads) {
                        setLocalError("Failed to upload attachments")
                        return
                      }

                      nextAttachments = nextAttachments.concat(
                        uploads.map((file) => ({
                          fileUrl: file.url || "",
                          fileName: file.name || "Attachment",
                          fileType: file.type || null,
                          fileSize: file.size?.toString() || null,
                        })),
                      )
                      setSelectedFiles([])
                    } catch (uploadError) {
                      setLocalError(
                        uploadError instanceof Error
                          ? uploadError.message
                          : "Failed to upload attachments",
                      )
                      return
                    }
                  }

                  nextAttachments = nextAttachments.concat(manualAttachments)
                  formData.set("attachments", JSON.stringify(nextAttachments))
                  formData.set("mode", submitMode)
                  await onSubmit(formData)
                }}
                className="space-y-5"
              >
                  {submission ? (
                    <div className="space-y-4">
                      <Panel variant="sunken" padding="sm" className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge tone={submissionTone(submission.status)}>{submission.status}</StatusBadge>
                          {submission.submittedAt ? (
                            <Text variant="caption" tone="muted">
                              Last submitted {formatDate(submission.submittedAt)}
                            </Text>
                          ) : null}
                        </div>
                        {submission.feedback ? (
                          <Callout tone="info" icon={false}>{submission.feedback}</Callout>
                        ) : null}
                      </Panel>

                      {submission.revisions.length > 0 ? (
                        <Field>
                          <FieldLabel>Revision history</FieldLabel>
                          <div className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-sunken px-3">
                            {submission.revisions.slice(0, 4).map((revision) => (
                              <div key={revision.id} className="flex items-center justify-between gap-3 py-2">
                                <Text variant="small">
                                  Revision {revision.revisionNumber} · {revision.action.replaceAll("_", " ")}
                                </Text>
                                <Text variant="caption" tone="muted">{formatDate(revision.createdAt)}</Text>
                              </div>
                            ))}
                          </div>
                        </Field>
                      ) : null}

                      {submission.gradingHistory.length > 0 ? (
                        <Field>
                          <FieldLabel>Grading history</FieldLabel>
                          <div className="space-y-2 rounded-lg border border-hairline bg-surface-sunken p-3">
                            {submission.gradingHistory.map((entry) => (
                              <div key={entry.id} className="rounded-md bg-card p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <Text variant="h4">Grade: {entry.grade}</Text>
                                  <Text variant="caption" tone="muted">{formatDate(entry.createdAt)}</Text>
                                </div>
                                {entry.feedback ? <Text variant="small" tone="muted" className="mt-2">{entry.feedback}</Text> : null}
                              </div>
                            ))}
                          </div>
                        </Field>
                      ) : null}
                    </div>
                  ) : null}

                  <Field>
                    <FieldLabel>Your work</FieldLabel>
                    <Textarea
                      name="content"
                      defaultValue={submission?.content || ""}
                      placeholder="Type your response here"
                      className="min-h-28 resize-none"
                    />
                  </Field>

                  <Field>
                    <FieldLabel optional>Attachments</FieldLabel>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        value={linkUrl}
                        onChange={(event) => setLinkUrl(event.target.value)}
                        placeholder="Paste a file link"
                      />
                      <Input
                        value={linkName}
                        onChange={(event) => setLinkName(event.target.value)}
                        placeholder="Link label"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!linkUrl.trim() || !linkName.trim()) {
                            setLocalError("Add both a link and label before saving it.")
                            return
                          }

                          setUploadedAttachments((current) => [
                            ...current,
                            { fileUrl: linkUrl.trim(), fileName: linkName.trim() },
                          ])
                          setLinkUrl("")
                          setLinkName("")
                          setLocalError(null)
                        }}
                      >
                        <Plus aria-hidden="true" />
                        Add link
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken p-3">
                      <div>
                        <Text variant="h4">Upload files</Text>
                        <Text variant="caption" tone="muted">Add up to five files.</Text>
                      </div>
                      <Button asChild variant="secondary" size="sm">
                        <label className="cursor-pointer">
                          <Paperclip aria-hidden="true" />
                          Choose files
                          <input type="file" multiple className="sr-only" onChange={handleAttachmentSelection} />
                        </label>
                      </Button>
                    </div>

                    {uploadedAttachments.length > 0 || submission?.attachments.length ? (
                      <div className="divide-y divide-hairline rounded-lg border border-hairline">
                        {uploadedAttachments.map((attachment, index) => (
                          <div key={`${attachment.fileUrl}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                            <a
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 truncate type-small font-medium text-primary-strong hover:underline"
                            >
                              {attachment.fileName}
                            </a>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${attachment.fileName}`} onClick={() => removeUploadedAttachment(index)}>
                              <X aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {selectedFiles.length > 0 ? (
                      <div className="divide-y divide-hairline rounded-lg border border-hairline">
                        {selectedFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                            <Text variant="small" truncate>{file.name}</Text>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={() => removeSelectedFile(index)}>
                              <X aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Field>

                  {error || localError ? (
                    <Callout tone="danger" role="alert">{localError || error}</Callout>
                  ) : null}
                </form>
              </ResponsiveOverlay>
          </div>
        ) : (
          <div className="space-y-3 border-t border-hairline pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text variant="caption" tone="muted" className="numeric-tabular">
                {allSubmissions.length} submitted · {gradedCount} graded
              </Text>
              <Button asChild variant="ghost" size="sm" className="-mr-2">
                <Link href={gradebookHref}>
                  <GraduationCap aria-hidden="true" />
                  Open gradebook
                </Link>
              </Button>
            </div>

            {ungradedSubmissions.length > 0 ? (
              <div className="divide-y divide-hairline rounded-lg border border-hairline">
                {ungradedSubmissions.slice(0, 3).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="touch-target row-interactive focus-ring flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                    onClick={() => setGradeOpen(entry.id)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <EntityAvatar name={entry.student.name} image={entry.student.image} colorKey={entry.student.id} size="xs" />
                      <div className="min-w-0">
                        <Text variant="h4" truncate>{entry.student.name}</Text>
                        <Text variant="caption" tone="muted">
                          {entry.revisions.length} revisions · {entry.attachments.length} attachments
                        </Text>
                      </div>
                    </div>
                    <StatusBadge tone="warning">Needs grading</StatusBadge>
                  </button>
                ))}
              </div>
            ) : allSubmissions.length > 0 ? (
              <Text variant="caption" tone="muted">All submissions graded.</Text>
            ) : (
              <Callout tone="neutral" icon={false}>No students have submitted work yet.</Callout>
            )}

            {gradingSubmission ? (
              <ClassworkGradingDialog
                open={!!gradeOpen}
                onOpenChange={(open) => !open && setGradeOpen(null)}
                submission={gradingSubmission}
                item={item}
                error={error}
                pending={pending}
                onGrade={onGrade}
              />
            ) : null}
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}
