"use client"

import { AlertCircle, BookOpen, Plus } from "lucide-react"

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

type ClassworkCreateDialogProps = {
  classColor: string
  error: string | null
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: FormData) => void
}

export function ClassworkCreateDialog({
  classColor,
  error,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: ClassworkCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          className={cn(
            buttonVariants({ size: "sm" }),
            "gap-2 shadow-sm hover:shadow-md transition-all text-white font-medium",
          )}
          style={{ backgroundColor: classColor }}
        >
          <Plus className="h-4 w-4" />
          Create
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] border-none shadow-2xl p-0 overflow-y-auto bg-background max-h-[calc(100vh-2rem)] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            Create Classwork
          </DialogTitle>
          <DialogDescription>
            Create a new assignment, quiz, or material for your students.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="p-6 space-y-6 flex-1 min-h-0">
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label htmlFor="classwork-title" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">
                Title
              </Label>
              <Input
                id="classwork-title"
                name="title"
                required
                placeholder="e.g. History of Rome Essay"
                className="h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classwork-description" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">
                Description
              </Label>
              <Textarea
                id="classwork-description"
                name="description"
                placeholder="Add instructions, guidelines, and other details..."
                rows={4}
                className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="classwork-type" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">
                  Type
                </Label>
                <select
                  id="classwork-type"
                  name="type"
                  className="flex h-10 w-full rounded-md border border-muted-foreground/20 bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="material">Material</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classwork-points" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">
                  Points
                </Label>
                <Input
                  id="classwork-points"
                  name="points"
                  type="number"
                  placeholder="100"
                  className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classwork-dueDate" className="text-xs font-semibold uppercase text-muted-foreground/80 tracking-wider">
                Due Date
              </Label>
              <Input
                id="classwork-dueDate"
                name="dueDate"
                type="datetime-local"
                className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants(), "text-white min-w-[100px] shadow-sm")}
              style={{ backgroundColor: classColor }}
            >
              {pending ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
