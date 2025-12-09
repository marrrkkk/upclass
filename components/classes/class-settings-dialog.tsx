"use client"

import { useState, useTransition } from "react"
import { Settings } from "lucide-react"
import { updateClass } from "@/app/actions/classes"
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
import { cn } from "@/lib/utils"

type ClassData = {
  id: string
  title: string
  description: string | null
  category: string | null
  color: string
}

type ClassSettingsDialogProps = {
  classData: ClassData
}

export function ClassSettingsDialog({ classData }: ClassSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleUpdate = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await updateClass(classData.id, formData)
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
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-10 w-10")}
          type="button"
          title="Class settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Class Settings</DialogTitle>
          <DialogDescription>
            Update your class information and appearance.
          </DialogDescription>
        </DialogHeader>
        <form action={handleUpdate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Title</span>
              <input
                name="title"
                required
                defaultValue={classData.title}
                placeholder="e.g. Mastering UI Design"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Category</span>
              <input
                name="category"
                defaultValue={classData.category || ""}
                placeholder="e.g. UI/UX"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              />
            </label>
          </div>
          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Description</span>
            <textarea
              name="description"
              defaultValue={classData.description || ""}
              placeholder="What will learners get from this class?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              rows={3}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Color</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="settings-color-picker"
                defaultValue={classData.color || "#3b82f6"}
                className="h-10 w-20 cursor-pointer rounded-md border border-input"
                onChange={(e) => {
                  const textInput = document.getElementById("settings-color-text") as HTMLInputElement
                  const hiddenInput = document.getElementById("settings-color-hidden") as HTMLInputElement
                  if (textInput) textInput.value = e.target.value
                  if (hiddenInput) hiddenInput.value = e.target.value
                }}
              />
              <input
                type="text"
                id="settings-color-text"
                defaultValue={classData.color || "#3b82f6"}
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                placeholder="#3b82f6"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                onChange={(e) => {
                  const colorInput = document.getElementById("settings-color-picker") as HTMLInputElement
                  const hiddenInput = document.getElementById("settings-color-hidden") as HTMLInputElement
                  if (colorInput && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
                    colorInput.value = e.target.value
                    if (hiddenInput) hiddenInput.value = e.target.value
                  }
                }}
              />
              <input type="hidden" id="settings-color-hidden" name="color" defaultValue={classData.color || "#3b82f6"} />
            </div>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

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
              className={cn(
                buttonVariants(),
                "bg-blue-600 hover:bg-blue-700 disabled:opacity-70",
              )}
            >
              {pending ? "Updating..." : "Update"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

