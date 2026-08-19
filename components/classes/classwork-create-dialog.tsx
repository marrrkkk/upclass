"use client"

import { BookOpen, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { Field, FieldGroup, FieldLabel, FieldRow } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ClassworkCreateDialogProps = {
  classColor: string
  error: string | null
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: FormData) => void
}

export function ClassworkCreateDialog({
  error,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: ClassworkCreateDialogProps) {
  return (
    <>
      <Button size="sm" onClick={() => onOpenChange(true)} aria-haspopup="dialog">
        <Plus aria-hidden="true" />
        Create
      </Button>
      <ResponsiveOverlay
        open={open}
        onOpenChange={onOpenChange}
        title={
          <span className="flex items-center gap-2">
            <IconBadge tone="primary" size="sm"><BookOpen /></IconBadge>
            Create classwork
          </span>
        }
        description="Create a new assignment, quiz, or material for your students."
        desktopClassName="sm:max-w-[38rem]"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="classwork-create-form" disabled={pending}>
              {pending ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form id="classwork-create-form" action={onSubmit} className="space-y-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="classwork-title">Title</FieldLabel>
              <Input id="classwork-title" name="title" required placeholder="History of Rome essay" />
            </Field>

            <Field>
              <FieldLabel htmlFor="classwork-description" optional>Description</FieldLabel>
              <Textarea
                id="classwork-description"
                name="description"
                placeholder="Add instructions and supporting details"
                rows={4}
                className="resize-none"
              />
            </Field>

            <FieldRow>
              <Field>
                <FieldLabel htmlFor="classwork-type">Type</FieldLabel>
                <select
                  id="classwork-type"
                  name="type"
                  className="focus-ring flex h-9 w-full rounded-md border border-input bg-background px-3 type-small"
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="material">Material</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="classwork-points" optional>Points</FieldLabel>
                <Input id="classwork-points" name="points" type="number" placeholder="100" />
              </Field>
            </FieldRow>

            <Field>
              <FieldLabel htmlFor="classwork-dueDate" optional>Due date</FieldLabel>
              <Input id="classwork-dueDate" name="dueDate" type="datetime-local" />
            </Field>
          </FieldGroup>

          {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
        </form>
      </ResponsiveOverlay>
    </>
  )
}
