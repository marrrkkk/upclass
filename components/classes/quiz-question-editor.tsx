"use client"

import { HelpCircle, Plus, Trash2, XCircle } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import type { DraftQuestion } from "@/components/classes/quiz-builder-utils"

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
    <Card className="border bg-card overflow-hidden shadow-sm relative group">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted-foreground/20 group-hover:bg-primary transition-colors duration-300" />

      <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onRemoveQuestion} disabled={!canRemove} className="text-muted-foreground hover:text-destructive transition-colors p-2 disabled:opacity-30">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <CardHeader className="pl-6 py-4 bg-muted/10 border-b flex flex-row items-center gap-4 space-y-0">
        <span className="text-sm font-semibold text-muted-foreground">Q{index + 1}</span>
        <Input
          value={question.prompt}
          onChange={(event) => onQuestionChange({ prompt: event.target.value })}
          placeholder="Enter your question here..."
          className="flex-1 bg-transparent border-transparent hover:bg-background hover:border-input focus:bg-background focus:border-input transition-all font-medium text-base h-9 shadow-none"
        />
      </CardHeader>

      <CardContent className="pl-6 p-4 pt-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Question Type</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={question.type}
              onChange={(event) =>
                onQuestionChange({ type: event.target.value as DraftQuestion["type"] })
              }
            >
              <option value="single_choice">Multiple Choice</option>
              <option value="multiple_select">Multiple Select</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short Answer</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Points</Label>
            <Input
              type="number"
              value={question.points}
              onChange={(event) => onQuestionChange({ points: Number(event.target.value || 0) })}
              className="h-9"
            />
          </div>
        </div>

        {question.type !== "short_answer" && (
          <div className="space-y-3 bg-muted/20 p-4 rounded-lg border border-dashed">
            <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 block">Answer Options</Label>
            {question.options.map((option) => (
              <div key={option.id} className="flex items-center gap-3">
                <div className="flex items-center h-9">
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
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                </div>
                <Input
                  value={option.text}
                  onChange={(event) => onOptionChange(option.id, event.target.value)}
                  className="flex-1 h-9 bg-background"
                  placeholder="Option text"
                  readOnly={question.type === "true_false"}
                />
                {question.type !== "true_false" && question.options.length > 2 && (
                  <button onClick={() => onRemoveOption(option.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {question.type === "true_false" ? (
              <p className="text-xs text-muted-foreground">
                True / false questions always use the fixed answers True and False.
              </p>
            ) : (
              <button
                type="button"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-xs")}
                onClick={onAddOption}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Add Option
              </button>
            )}
          </div>
        )}

        {question.type === "short_answer" && (
          <div className="bg-muted/20 p-4 rounded-lg border border-dashed text-sm text-muted-foreground italic flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Students will type their answer. Grading will be manual.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
