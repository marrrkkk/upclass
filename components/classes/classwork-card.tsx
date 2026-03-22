"use client"

import { useState } from "react"
import Image from "next/image"
import {
  BookOpen,
  CheckCircle,
  Clock,
  Edit,
  File,
  FileQuestion,
  FileText,
  MoreVertical,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { ClassworkCardSkeleton } from "@/components/skeletons"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"
import type { ClassworkData, SubmissionData } from "@/types/classes"

type ClassworkCardProps = {
  allSubmissions: SubmissionData[]
  classColor: string
  deleting: boolean
  error: string | null
  item: ClassworkData
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
      return <FileText className="h-5 w-5" />
    case "quiz":
      return <FileQuestion className="h-5 w-5" />
    case "material":
      return <BookOpen className="h-5 w-5" />
    default:
      return <File className="h-5 w-5" />
  }
}

export function ClassworkCard({
  allSubmissions,
  classColor,
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
  const [submitOpen, setSubmitOpen] = useState(false)
  const [gradeOpen, setGradeOpen] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkName, setLinkName] = useState("")
  const [uploadedAttachments, setUploadedAttachments] = useState<PendingAttachment[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitMode, setSubmitMode] = useState<"draft" | "submit">("submit")
  const { startUpload, isUploading } = useUploadThing("submissionAttachmentUploader")

  const isDueSoon =
    item.dueDate &&
    new Date(item.dueDate) > new Date() &&
    new Date(item.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000

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
    <Card
      className="group overflow-hidden border-l-[6px] border-border/60 transition-all hover:border-border hover:shadow-sm"
      style={{ borderLeftColor: classColor }}
    >
      <CardHeader className="pl-5 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-lg bg-muted p-2 text-muted-foreground transition-colors duration-300 group-hover:bg-primary/5 group-hover:text-primary">
              {getTypeIcon(item.type)}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold transition-colors group-hover:text-primary">
                {item.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {item.points ? (
                  <span className="rounded bg-muted/50 px-1.5 py-0.5 font-medium text-foreground/70">
                    {item.points} pts
                  </span>
                ) : null}
                <span className="capitalize">{item.type}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>Posted {new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            {item.dueDate ? (
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 font-normal",
                  isDueSoon ? "border-amber-200 bg-amber-50 text-amber-700" : "bg-muted/30",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Due {formatDate(item.dueDate)}
              </Badge>
            ) : null}

            {userRole === "teacher" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus:outline-none group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pl-5 pt-0">
        <div className="ml-[3.25rem] space-y-4">
          {item.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground transition-all duration-300 group-hover:line-clamp-none">
              {item.description}
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            {userRole === "student" ? (
              <>
                {submission ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant={submission.status === "graded" ? "default" : "secondary"}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1",
                        submission.status === "graded"
                          ? "border-transparent bg-green-100 text-green-700 hover:bg-green-100"
                          : submission.status === "draft"
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
                            : "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-100",
                      )}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {submission.status === "graded"
                        ? "Graded"
                        : submission.status === "draft"
                          ? "Draft"
                          : "Submitted"}
                    </Badge>

                    {submission.grade ? (
                      <span className="text-sm font-semibold">
                        {submission.grade} / {item.points}
                      </span>
                    ) : null}

                    <button
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      onClick={openSubmissionDialog}
                    >
                      {submission.status === "draft" ? "Continue Draft" : "View Details"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={openSubmissionDialog}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "h-8 gap-1.5 px-4 text-xs font-medium text-white shadow-sm",
                    )}
                    style={{ backgroundColor: classColor }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Start Work
                  </button>
                )}

                <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
                  <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-y-auto border-none p-0 shadow-2xl sm:max-w-[650px]">
                    <DialogHeader className="shrink-0 border-b bg-muted/30 p-6 pb-4">
                      <DialogTitle className="text-xl">
                        {submission ? "Submission Workspace" : "Submit Assignment"}
                      </DialogTitle>
                      <DialogDescription className="mt-1.5">{item.title}</DialogDescription>
                    </DialogHeader>

                    <form
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
                          const uploads = await startUpload(selectedFiles)
                          if (!uploads) {
                            setLocalError("Failed to upload attachments")
                            return
                          }

                          nextAttachments = nextAttachments.concat(
                            uploads.map((file) => ({
                              fileUrl: file.ufsUrl || file.url || "",
                              fileName: file.name || "Attachment",
                              fileType: file.type || null,
                              fileSize: file.size?.toString() || null,
                            })),
                          )
                          setSelectedFiles([])
                        }

                        nextAttachments = nextAttachments.concat(manualAttachments)
                        formData.set("attachments", JSON.stringify(nextAttachments))
                        formData.set("mode", submitMode)
                        await onSubmit(formData)
                      }}
                      className="space-y-6 p-6"
                    >
                      {submission ? (
                        <div className="space-y-4">
                          <div className="rounded-lg border bg-muted/20 p-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <Badge variant="outline">{submission.status}</Badge>
                              {submission.submittedAt ? (
                                <span className="text-xs text-muted-foreground">
                                  Last submitted {formatDate(submission.submittedAt)}
                                </span>
                              ) : null}
                            </div>
                            {submission.feedback ? (
                              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-900">
                                {submission.feedback}
                              </div>
                            ) : null}
                          </div>

                          {submission.revisions.length > 0 ? (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Revision History
                              </Label>
                              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                                {submission.revisions.slice(0, 4).map((revision) => (
                                  <div key={revision.id} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="font-medium">
                                      Revision {revision.revisionNumber} · {revision.action.replaceAll("_", " ")}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(revision.createdAt)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {submission.gradingHistory.length > 0 ? (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Grading History
                              </Label>
                              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                                {submission.gradingHistory.map((entry) => (
                                  <div key={entry.id} className="rounded-md bg-background p-3 text-sm">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold">Grade: {entry.grade}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(entry.createdAt)}
                                      </span>
                                    </div>
                                    {entry.feedback ? (
                                      <p className="mt-2 text-muted-foreground">{entry.feedback}</p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Your Work
                          </Label>
                          <Textarea
                            name="content"
                            defaultValue={submission?.content || ""}
                            placeholder="Type your response here..."
                            className="min-h-[120px] resize-none rounded-md border-muted-foreground/20 bg-muted/20 leading-relaxed transition-colors focus-visible:bg-background"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Attachments
                          </Label>

                          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                            <Input
                              value={linkUrl}
                              onChange={(event) => setLinkUrl(event.target.value)}
                              placeholder="Paste a file link"
                              className="bg-muted/20"
                            />
                            <Input
                              value={linkName}
                              onChange={(event) => setLinkName(event.target.value)}
                              placeholder="Link label"
                              className="bg-muted/20"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!linkUrl.trim() || !linkName.trim()) {
                                  setLocalError("Add both a link and label before saving it.")
                                  return
                                }

                                setUploadedAttachments((current) => [
                                  ...current,
                                  {
                                    fileUrl: linkUrl.trim(),
                                    fileName: linkName.trim(),
                                  },
                                ])
                                setLinkUrl("")
                                setLinkName("")
                                setLocalError(null)
                              }}
                              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                            >
                              <Plus className="h-4 w-4" />
                              Add link
                            </button>
                          </div>

                          <div className="rounded-lg border border-dashed bg-muted/10 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">Upload files</p>
                                <p className="text-xs text-muted-foreground">
                                  Add up to 5 files to this submission.
                                </p>
                              </div>
                              <label className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "cursor-pointer gap-2")}>
                                <Paperclip className="h-4 w-4" />
                                Choose files
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={handleAttachmentSelection}
                                />
                              </label>
                            </div>
                          </div>

                          {(uploadedAttachments.length > 0 || submission?.attachments.length) ? (
                            <div className="space-y-2">
                              {uploadedAttachments.map((attachment, index) => (
                                <div
                                  key={`${attachment.fileUrl}-${index}`}
                                  className="flex items-center justify-between rounded-md border bg-muted/20 p-3 text-sm"
                                >
                                  <a
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate font-medium text-primary hover:underline"
                                  >
                                    {attachment.fileName}
                                  </a>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={() => removeUploadedAttachment(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {selectedFiles.length > 0 ? (
                            <div className="space-y-2">
                              {selectedFiles.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border bg-background p-3 text-sm">
                                  <span className="truncate font-medium">{file.name}</span>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={() => removeSelectedFile(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {error || localError ? (
                        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                          {localError || error}
                        </div>
                      ) : null}

                      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                        <button
                          type="button"
                          onClick={() => setSubmitOpen(false)}
                          className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
                        >
                          Close
                        </button>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="submit"
                            disabled={pending || isUploading}
                            onClick={() => setSubmitMode("draft")}
                            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                          >
                            <Save className="h-4 w-4" />
                            {pending && submitMode === "draft" ? "Saving..." : "Save Draft"}
                          </button>
                          <button
                            type="submit"
                            disabled={pending || isUploading}
                            onClick={() => setSubmitMode("submit")}
                            className={cn(buttonVariants(), "gap-2 text-white shadow-sm")}
                            style={{ backgroundColor: classColor }}
                          >
                            <Upload className="h-4 w-4" />
                            {pending || isUploading
                              ? "Sending..."
                              : submission?.status === "graded" || submission?.status === "submitted"
                                ? "Resubmit"
                                : "Submit"}
                          </button>
                        </div>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="w-full">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {allSubmissions.length} submissions
                  </span>
                </div>

                {allSubmissions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {allSubmissions.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className="group/sub flex cursor-pointer items-center justify-between rounded-md border bg-muted/30 p-2 text-sm transition-colors hover:bg-muted/60"
                        onClick={() => setGradeOpen(entry.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-muted-foreground/20 text-xs font-semibold">
                            {entry.student.image ? (
                              <Image
                                src={entry.student.image}
                                alt={entry.student.name}
                                width={24}
                                height={24}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              entry.student.name[0]
                            )}
                          </div>
                          <div>
                            <span className="font-medium">{entry.student.name}</span>
                            <p className="text-[11px] text-muted-foreground">
                              {entry.revisions.length} revisions · {entry.attachments.length} attachments
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {entry.grade ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                              {entry.grade}/{item.points}
                            </span>
                          ) : (
                            <span className="rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-xs text-orange-600">
                              Needs Grading
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {allSubmissions.length > 3 ? (
                      <p className="pt-1 text-center text-xs text-muted-foreground">
                        + {allSubmissions.length - 3} more submissions
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center">
                    <p className="text-xs text-muted-foreground">No students have submitted work yet.</p>
                  </div>
                )}

                <Dialog open={!!gradeOpen} onOpenChange={(open) => !open && setGradeOpen(null)}>
                  {(() => {
                    const gradingSubmission = allSubmissions.find((entry) => entry.id === gradeOpen)
                    if (!gradingSubmission) return null

                    return (
                      <DialogContent className="gap-0 border-none p-0 shadow-2xl sm:max-w-[700px]">
                        <DialogHeader className="border-b bg-muted/30 p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <DialogTitle className="text-lg">Review Submission</DialogTitle>
                              <DialogDescription className="mt-1">{item.title}</DialogDescription>
                            </div>
                            <div className="flex items-center gap-2 pr-4">
                              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted-foreground/10">
                                {gradingSubmission.student.image ? (
                                  <Image
                                    src={gradingSubmission.student.image}
                                    alt={gradingSubmission.student.name}
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-bold">{gradingSubmission.student.name[0]}</span>
                                )}
                              </div>
                              <span className="text-sm font-medium">{gradingSubmission.student.name}</span>
                            </div>
                          </div>
                        </DialogHeader>

                        <div className="space-y-6 p-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Latest Submission
                            </Label>
                            <div className="min-h-[80px] rounded-lg border bg-muted/30 p-4 text-sm">
                              {gradingSubmission.content ? (
                                <p className="whitespace-pre-wrap leading-relaxed">
                                  {gradingSubmission.content}
                                </p>
                              ) : (
                                <p className="italic text-muted-foreground">No text content submitted.</p>
                              )}

                              {gradingSubmission.attachments.length > 0 ? (
                                <div className="mt-4 space-y-2 border-t pt-4">
                                  {gradingSubmission.attachments.map((attachment) => (
                                    <a
                                      key={attachment.id}
                                      href={attachment.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 rounded border bg-background p-2 shadow-sm transition-colors hover:bg-muted/10"
                                    >
                                      <File className="h-4 w-4" />
                                      <span className="font-medium">{attachment.fileName}</span>
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {gradingSubmission.revisions.length > 0 ? (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Revision Timeline
                              </Label>
                              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                                {gradingSubmission.revisions.map((revision) => (
                                  <div key={revision.id} className="flex items-center justify-between text-sm">
                                    <span>
                                      Revision {revision.revisionNumber} · {revision.action}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(revision.createdAt)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <form action={(formData) => onGrade(gradingSubmission.id, formData)} className="space-y-6 pt-2">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Grade
                                </Label>
                                <div className="relative">
                                  <Input
                                    name="grade"
                                    required
                                    type="number"
                                    defaultValue={gradingSubmission.grade || ""}
                                    placeholder="0"
                                    className="h-11 bg-muted/20 pr-12 text-lg font-medium transition-colors focus-visible:bg-background"
                                  />
                                  <span className="absolute right-3 top-3 text-sm text-muted-foreground">
                                    / {item.points}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 sm:col-span-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Feedback
                                </Label>
                                <Textarea
                                  name="feedback"
                                  defaultValue={gradingSubmission.feedback || ""}
                                  placeholder="Write feedback for the student..."
                                  rows={3}
                                  className="resize-none bg-muted/20 transition-colors focus-visible:bg-background"
                                />
                              </div>
                            </div>

                            {gradingSubmission.gradingHistory.length > 0 ? (
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Grading History
                                </Label>
                                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                                  {gradingSubmission.gradingHistory.map((entry) => (
                                    <div key={entry.id} className="rounded-md bg-background p-3 text-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{entry.grade}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatDate(entry.createdAt)}
                                        </span>
                                      </div>
                                      {entry.feedback ? (
                                        <p className="mt-2 text-muted-foreground">{entry.feedback}</p>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {error ? (
                              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                                {error}
                              </div>
                            ) : null}

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
}
