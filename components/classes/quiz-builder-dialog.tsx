"use client"

import type { ReactNode } from "react"
import { Edit, FileQuestion, Plus, Settings2, XCircle } from "lucide-react"

import { QuizQuestionEditor } from "@/components/classes/quiz-question-editor"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { DraftQuestion } from "@/components/classes/quiz-builder-utils"

type QuizBuilderDialogProps = {
  mode: "create" | "edit"
  open: boolean
  title: string
  description: string
  dueDate: string | null
  timeLimitSeconds: string
  status?: "draft" | "published"
  questions: DraftQuestion[]
  classColor: string
  error: string | null
  pending: boolean
  trigger?: ReactNode
  onOpenChange: (open: boolean) => void
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onDueDateChange: (value: string | null) => void
  onTimeLimitChange: (value: string) => void
  onStatusChange?: (value: "draft" | "published") => void
  onAddQuestion: () => void
  onRemoveQuestion: (questionId: string) => void
  onQuestionChange: (questionId: string, update: Partial<DraftQuestion>) => void
  onOptionChange: (questionId: string, optionId: string, text: string, isCorrect?: boolean) => void
  onAddOption: (questionId: string) => void
  onRemoveOption: (questionId: string, optionId: string) => void
  onCancel: () => void
  onSave: () => void
  onPrimaryAction: () => void
}

export function QuizBuilderDialog({
  mode,
  open,
  title,
  description,
  dueDate,
  timeLimitSeconds,
  status,
  questions,
  classColor,
  error,
  pending,
  trigger,
  onOpenChange,
  onTitleChange,
  onDescriptionChange,
  onDueDateChange,
  onTimeLimitChange,
  onStatusChange,
  onAddQuestion,
  onRemoveQuestion,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onCancel,
  onSave,
  onPrimaryAction,
}: QuizBuilderDialogProps) {
  const isCreateMode = mode === "create"
  const titleIcon = isCreateMode ? FileQuestion : Edit
  const TitleIcon = titleIcon
  const actionLabel = isCreateMode ? "Create Quiz" : "Edit Quiz"
  const actionDescription = isCreateMode
    ? "Draft a quiz and publish when ready."
    : "Update quiz details and questions."

  const dialogContent = (
    <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-5xl gap-0 p-0 border-none shadow-2xl bg-background overflow-hidden">
      <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <TitleIcon className="h-5 w-5" />
            </div>
            {actionLabel}
          </DialogTitle>
        </div>
        <DialogDescription>{actionDescription}</DialogDescription>
      </DialogHeader>

      <div className="flex-1 min-h-0 p-6 space-y-8 bg-muted/5 overflow-y-auto">
        <div className="p-5 rounded-xl border bg-card shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Quiz Settings</h3>
          </div>

          <div className={isCreateMode ? "space-y-2" : "grid gap-6 sm:grid-cols-2"}>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Title</Label>
              <Input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Quiz title" className="font-medium" />
            </div>
            {!isCreateMode && onStatusChange && status && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={status}
                  onChange={(event) => onStatusChange(event.target.value as "draft" | "published")}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={2} className="resize-none" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Due Date (Optional)</Label>
              <Input type="datetime-local" value={dueDate || ""} onChange={(event) => onDueDateChange(event.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                Time Limit (Optional)
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Seconds</span>
              </Label>
              <Input
                type="number"
                value={timeLimitSeconds}
                onChange={(event) => onTimeLimitChange(event.target.value)}
                placeholder="e.g. 900 for 15 mins"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-bold text-primary">{questions.length}</span>
            <h3 className="font-semibold text-lg">Questions</h3>
          </div>

          <div className="space-y-6">
            {questions.map((question, index) => (
              <QuizQuestionEditor
                key={question.id}
                question={question}
                index={index}
                radioName={`${mode}-correct-${question.id}`}
                canRemove={questions.length > 1}
                onQuestionChange={(update) => onQuestionChange(question.id, update)}
                onOptionChange={(optionId, text, isCorrect) =>
                  onOptionChange(question.id, optionId, text, isCorrect)
                }
                onAddOption={() => onAddOption(question.id)}
                onRemoveOption={(optionId) => onRemoveOption(question.id, optionId)}
                onRemoveQuestion={() => onRemoveQuestion(question.id)}
              />
            ))}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={onAddQuestion}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 bg-background shadow-sm")}
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>
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
          {questions.length} Questions • {questions.reduce((total, question) => total + question.points, 0)} Total Points
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost" }))}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "shadow-sm")}
            onClick={onSave}
            disabled={pending}
          >
            {pending ? (isCreateMode ? "Saving..." : "Saving...") : isCreateMode ? "Save Draft" : "Save Changes"}
          </button>
          <button
            type="button"
            className={cn(buttonVariants(), "text-white shadow-md min-w-[100px]")}
            style={{ backgroundColor: classColor }}
            onClick={onPrimaryAction}
            disabled={pending}
          >
            {pending ? (isCreateMode ? "Publishing..." : "Saving...") : isCreateMode ? "Publish Quiz" : "Save & Publish"}
          </button>
        </div>
      </DialogFooter>
    </DialogContent>
  )

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {dialogContent}
    </Dialog>
  )
}
