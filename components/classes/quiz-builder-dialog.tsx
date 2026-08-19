"use client"

import type { ReactNode } from "react"
import { Edit, FileQuestion, Plus, Settings2 } from "lucide-react"

import type { DraftQuestion } from "@/components/classes/quiz-builder-utils"
import { QuizAiGenerator } from "@/components/classes/quiz-ai-generator"
import { QuizQuestionEditor } from "@/components/classes/quiz-question-editor"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldRow } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { Panel, PanelBody, PanelHeader, PanelHeading, PanelTitle } from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"

type QuizBuilderDialogProps = {
  classId: string
  onGeneratedQuiz?: (quiz: import("@/lib/quiz-ai").AiGeneratedQuiz) => void
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
  classId,
  onGeneratedQuiz,
  mode,
  open,
  title,
  description,
  dueDate,
  timeLimitSeconds,
  status,
  questions,
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
  const TitleIcon = isCreateMode ? FileQuestion : Edit
  const actionLabel = isCreateMode ? "Create quiz" : "Edit quiz"
  const actionDescription = isCreateMode
    ? "Draft a quiz and publish when ready."
    : "Update quiz details and questions."

  const dialogContent = (
    <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
      <DialogHeader className="shrink-0 border-b border-hairline px-5 py-4 sm:px-6">
        <DialogTitle className="flex items-center gap-2">
          <IconBadge tone="primary" size="sm"><TitleIcon /></IconBadge>
          {actionLabel}
        </DialogTitle>
        <DialogDescription>{actionDescription}</DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-surface p-4 sm:p-6">
        <Panel padding="none" className="overflow-hidden">
          <PanelHeader>
            <PanelHeading>
              <PanelTitle><Settings2 className="size-4 text-muted-foreground" /> Quiz settings</PanelTitle>
            </PanelHeading>
          </PanelHeader>
          <PanelBody className="space-y-5">
            <FieldRow>
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Quiz title" />
              </Field>
              {!isCreateMode && onStatusChange && status ? (
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <select
                    className="focus-ring flex h-9 w-full rounded-md border border-input bg-background px-3 type-small"
                    value={status}
                    onChange={(event) => onStatusChange(event.target.value as "draft" | "published")}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </Field>
              ) : <div />}
            </FieldRow>

            <Field>
              <FieldLabel optional>Description</FieldLabel>
              <Textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={2} className="resize-none" />
            </Field>

            <FieldRow>
              <Field>
                <FieldLabel optional>Due date</FieldLabel>
                <Input type="datetime-local" value={dueDate || ""} onChange={(event) => onDueDateChange(event.target.value || null)} />
              </Field>
              <Field>
                <FieldLabel optional hint="Seconds">Time limit</FieldLabel>
                <Input
                  type="number"
                  value={timeLimitSeconds}
                  onChange={(event) => onTimeLimitChange(event.target.value)}
                  placeholder="900"
                />
              </Field>
            </FieldRow>
          </PanelBody>
        </Panel>

        {isCreateMode && onGeneratedQuiz ? (
          <QuizAiGenerator classId={classId} disabled={pending} onGenerated={onGeneratedQuiz} />
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Text as="h3" variant="h3">Questions</Text>
            <Text variant="caption" tone="muted" className="numeric-tabular">
              {questions.length} total
            </Text>
          </div>

          <div className="space-y-3">
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

            <Button type="button" variant="outline" size="sm" onClick={onAddQuestion}>
              <Plus aria-hidden="true" />
              Add question
            </Button>
          </div>
        </section>

        {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
      </div>

      <DialogFooter className="shrink-0 border-t border-hairline px-5 py-4 sm:justify-between sm:px-6">
        <Text variant="caption" tone="muted" className="numeric-tabular">
          {questions.length} questions · {questions.reduce((total, question) => total + question.points, 0)} total points
        </Text>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="outline" onClick={onSave} disabled={pending}>
            {pending ? "Saving..." : isCreateMode ? "Save draft" : "Save changes"}
          </Button>
          <Button type="button" onClick={onPrimaryAction} disabled={pending}>
            {pending ? (isCreateMode ? "Publishing..." : "Saving...") : isCreateMode ? "Publish quiz" : "Save and publish"}
          </Button>
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

  return <Dialog open={open} onOpenChange={onOpenChange}>{dialogContent}</Dialog>
}
