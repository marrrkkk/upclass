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
  Trash2,
  Upload,
} from "lucide-react"

import { AnnouncementSkeleton } from "@/components/skeletons"
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
  onSubmit: (formData: FormData) => void
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
  const isDueSoon =
    item.dueDate &&
    new Date(item.dueDate) > new Date() &&
    new Date(item.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000

  if (deleting) {
    return <AnnouncementSkeleton />
  }

  return (
    <Card
      className="group border-border/60 hover:border-border transition-all hover:shadow-sm overflow-hidden border-l-[6px]"
      style={{ borderLeftColor: classColor }}
    >
      <CardHeader className="pl-5 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors duration-300">
              {getTypeIcon(item.type)}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
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
            <Badge
              variant="outline"
              className={cn(
                "flex shrink-0 items-center gap-1.5 font-normal px-2.5 py-1",
                isDueSoon ? "border-amber-200 bg-amber-50 text-amber-700" : "bg-muted/30",
              )}
            >
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
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
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
            <p className="text-sm text-muted-foreground line-clamp-2 group-hover:line-clamp-none transition-all duration-300 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="pt-2 flex items-center justify-between">
            {userRole === "student" ? (
              <>
                {submission ? (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={submission.status === "graded" ? "default" : "secondary"}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1",
                        submission.status === "graded"
                          ? "bg-green-100 text-green-700 hover:bg-green-100 border-transparent shadow-none"
                          : "",
                        submission.status === "submitted"
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-transparent"
                          : "",
                      )}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {submission.status === "graded" ? "Graded" : "Submitted"}
                    </Badge>

                    {submission.grade && (
                      <span className="text-sm font-semibold">
                        {submission.grade} / {item.points}
                      </span>
                    )}

                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                      onClick={() => setSubmitOpen(true)}
                    >
                      View Details
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSubmitOpen(true)}
                    className={cn(buttonVariants({ size: "sm" }), "h-8 px-4 font-medium text-xs gap-1.5 text-white shadow-sm")}
                    style={{ backgroundColor: classColor }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Submit Work
                  </button>
                )}

                <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
                  <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-y-auto border-none shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
                    <DialogHeader className="p-6 pb-4 border-b bg-muted/30 shrink-0">
                      <DialogTitle className="text-xl">
                        {submission ? "Submission Details" : "Submit Assignment"}
                      </DialogTitle>
                      <DialogDescription className="mt-1.5">{item.title}</DialogDescription>
                    </DialogHeader>

                    {submission && submission.status !== "new" && (
                      <div className="p-6 pb-0 space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  submission.status === "graded"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200",
                                )}
                              >
                                {submission.status
                                  .split("_")
                                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(" ")}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                on {formatDate(submission.submittedAt)}
                              </span>
                            </div>
                          </div>
                          {submission.grade && (
                            <div className="text-right">
                              <p className="text-2xl font-bold">{submission.grade}</p>
                              <p className="text-xs text-muted-foreground uppercase font-medium">
                                Out of {item.points}
                              </p>
                            </div>
                          )}
                        </div>

                        {submission.feedback && (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                              Teacher Feedback
                            </Label>
                            <div className="p-4 rounded-lg bg-blue-50/50 text-blue-900/80 text-sm leading-relaxed border border-blue-100">
                              {submission.feedback}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <form action={onSubmit} className="p-6 space-y-6">
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
                                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                  Attachment
                                </Label>
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
                              onClick={() => setSubmitOpen(false)}
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
                              {pending ? "Submitting..." : submission ? "Update" : "Submit"}
                            </button>
                          </DialogFooter>
                        </>
                      ) : (
                        <DialogFooter>
                          <button
                            type="button"
                            onClick={() => setSubmitOpen(false)}
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
                </div>

                {allSubmissions.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {allSubmissions.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30 border text-sm group/sub hover:bg-muted/60 transition-colors cursor-pointer"
                        onClick={() => setGradeOpen(entry.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-semibold overflow-hidden">
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
                          <span className="font-medium">{entry.student.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {entry.grade ? (
                            <span className="font-semibold text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {entry.grade}/{item.points}
                            </span>
                          ) : (
                            <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                              Needs Grading
                            </span>
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

                <Dialog open={!!gradeOpen} onOpenChange={(open) => !open && setGradeOpen(null)}>
                  {(() => {
                    const gradingSubmission = allSubmissions.find((entry) => entry.id === gradeOpen)
                    if (!gradingSubmission) return null

                    return (
                      <DialogContent className="sm:max-w-[600px] gap-0 p-0 border-none shadow-2xl">
                        <DialogHeader className="p-6 border-b bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <DialogTitle className="text-lg">Grading</DialogTitle>
                              <DialogDescription className="mt-1">{item.title}</DialogDescription>
                            </div>
                            <div className="flex items-center gap-2 pr-4">
                              <div className="h-8 w-8 rounded-full bg-muted-foreground/10 flex items-center justify-center overflow-hidden">
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
                              <span className="font-medium text-sm">{gradingSubmission.student.name}</span>
                            </div>
                          </div>
                        </DialogHeader>

                        <div className="p-6 space-y-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                              Student Submission
                            </Label>
                            <div className="p-4 rounded-lg bg-muted/30 border text-sm min-h-[80px]">
                              {gradingSubmission.content ? (
                                <p className="whitespace-pre-wrap leading-relaxed">{gradingSubmission.content}</p>
                              ) : (
                                <p className="text-muted-foreground italic">No text content submitted.</p>
                              )}

                              {gradingSubmission.fileUrl && (
                                <div className="mt-4 pt-4 border-t flex items-center gap-2">
                                  <a
                                    href={gradingSubmission.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-primary hover:underline bg-background p-2 rounded border shadow-sm transition-colors"
                                  >
                                    <File className="h-4 w-4" />
                                    <span className="font-medium">
                                      {gradingSubmission.fileName || "Attached File"}
                                    </span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          <form action={(formData) => onGrade(gradingSubmission.id, formData)} className="space-y-6 pt-2">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                  Grade
                                </Label>
                                <div className="relative">
                                  <Input
                                    name="grade"
                                    required
                                    type="number"
                                    defaultValue={gradingSubmission.grade || ""}
                                    placeholder="0"
                                    className="h-11 text-lg font-medium bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors pr-12"
                                  />
                                  <span className="absolute right-3 top-3 text-sm text-muted-foreground">
                                    / {item.points}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 sm:col-span-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                  Feedback
                                </Label>
                                <Textarea
                                  name="feedback"
                                  defaultValue={gradingSubmission.feedback || ""}
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
}
