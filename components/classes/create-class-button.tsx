"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"

import { createClass } from "@/app/actions/classes"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function CreateClassButton() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleCreate = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await createClass(formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(buttonVariants({ size: "sm" }), "gap-2")}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Create class
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new class for your students.
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="e.g. Mastering UI Design"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder="e.g. UI/UX"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What will learners get from this class?"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                name="schedule"
                placeholder="e.g. Mon, Wed, Fri 10:00 AM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color-text">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="color-picker"
                  defaultValue="#3b82f6"
                  className="h-10 w-20 cursor-pointer rounded-md border border-input"
                  onChange={(e) => {
                    const textInput = document.getElementById("color-text") as HTMLInputElement
                    const hiddenInput = document.getElementById("color-hidden") as HTMLInputElement
                    if (textInput) textInput.value = e.target.value
                    if (hiddenInput) hiddenInput.value = e.target.value
                  }}
                />
                <Input
                  type="text"
                  id="color-text"
                  defaultValue="#3b82f6"
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  placeholder="#3b82f6"
                  className="flex-1"
                  onChange={(e) => {
                    const colorInput = document.getElementById("color-picker") as HTMLInputElement
                    const hiddenInput = document.getElementById("color-hidden") as HTMLInputElement
                    if (colorInput && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
                      colorInput.value = e.target.value
                      if (hiddenInput) hiddenInput.value = e.target.value
                    }
                  }}
                />
                <input type="hidden" id="color-hidden" name="color" defaultValue="#3b82f6" />
              </div>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants())}
            >
              {pending ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

