"use client"

import { HelpCircle, Plus, Trash2, XCircle } from "lucide-react"

import type { DraftQuestion } from "@/components/classes/quiz-builder-utils"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"

type QuizQuestionEditorProps = {
  question: DraftQuestion
  index: number
  radioName: string
  canRemove: boolean
  onQuestionChange: (update: Partial<DraftQuestion>) => void
  onOptionChange: (optionId: string, text: string, isCorrect?: boolean) => void
  onAddOption: () => void
  onRemoveOption: (optionId: string) => void
  onRemoveQuestion: () => void
}

export function QuizQuestionEditor({
  question,
  index,
  radioName,
  canRemove,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onRemoveQuestion,
}: QuizQuestionEditorProps) {
  return (
    <Panel padding="none" className="overflow-hidden">
      <PanelHeader className="flex-row items-center py-3">
        <StatusBadge tone="neutral">Q{index + 1}</StatusBadge>
        <Input
          value={question.prompt}
          onChange={(event) => onQuestionChange({ prompt: event.target.value })}
          placeholder="Enter your question"
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemoveQuestion}
          disabled={!canRemove}
          aria-label={`Remove question ${index + 1}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </PanelHeader>

      <PanelBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field className="sm:col-span-2">
            <FieldLabel>Question type</FieldLabel>
            <select
              className="focus-ring flex h-9 w-full rounded-md border border-input bg-background px-3 type-small"
              value={question.type}
              onChange={(event) =>
                onQuestionChange({ type: event.target.value as DraftQuestion["type"] })
              }
            >
              <option value="single_choice">Multiple choice</option>
              <option value="multiple_select">Multiple select</option>
              <option value="true_false">True / false</option>
              <option value="short_answer">Short answer</option>
            </select>
          </Field>
          <Field>
            <FieldLabel>Points</FieldLabel>
            <Input
              type="number"
              value={question.points}
              onChange={(event) => onQuestionChange({ points: Number(event.target.value || 0) })}
            />
          </Field>
        </div>

        {question.type !== "short_answer" ? (
          <Field>
            <FieldLabel>Answer options</FieldLabel>
            <div className="space-y-2 rounded-lg border border-hairline bg-surface-sunken p-3">
              {question.options.map((option) => (
                <div key={option.id} className="flex items-center gap-3">
                  <input
                    type={question.type === "multiple_select" ? "checkbox" : "radio"}
                    name={radioName}
                    checked={option.isCorrect}
                    onChange={(event) => {
                      if (question.type === "multiple_select") {
                        onOptionChange(option.id, option.text, event.target.checked)
                        return
                      }

                      onQuestionChange({
                        options: question.options.map((entry) => ({
                          ...entry,
                          isCorrect: entry.id === option.id,
                        })),
                      })
                    }}
                    className="size-4 cursor-pointer accent-primary"
                    aria-label={`Mark ${option.text || "option"} correct`}
                  />
                  <Input
                    value={option.text}
                    onChange={(event) => onOptionChange(option.id, event.target.value)}
                    className="min-w-0 flex-1 bg-card"
                    placeholder="Option text"
                    readOnly={question.type === "true_false"}
                  />
                  {question.type !== "true_false" && question.options.length > 2 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemoveOption(option.id)}
                      aria-label={`Remove ${option.text || "option"}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <XCircle aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              ))}
              {question.type === "true_false" ? (
                <Callout tone="neutral" icon={false}>
                  True / false questions always use the fixed answers True and False.
                </Callout>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={onAddOption}>
                  <Plus aria-hidden="true" />
                  Add option
                </Button>
              )}
            </div>
          </Field>
        ) : (
          <Callout tone="info" icon={<HelpCircle />}>
            Students will type their answer. Grading will be manual.
          </Callout>
        )}
      </PanelBody>
    </Panel>
  )
}
