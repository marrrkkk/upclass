"use client"

import { useState, useTransition } from "react"
import { Settings } from "lucide-react"
import { updateClass } from "@/app/actions/classes"
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

type ClassData = {
  id: string
  title: string
  description: string | null
  category: string | null
  color: string
  schedule: string | null
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
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={classData.title}
                placeholder="e.g. Mastering UI Design"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                defaultValue={classData.category || ""}
                placeholder="e.g. UI/UX"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={classData.description || ""}
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
                defaultValue={classData.schedule || ""}
                placeholder="e.g. Mon, Wed, Fri 10:00 AM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-color-text">Color</Label>
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
                <Input
                  type="text"
                  id="settings-color-text"
                  defaultValue={classData.color || "#3b82f6"}
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  placeholder="#3b82f6"
                  className="flex-1"
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
            </div>
          </div>

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
              className={cn(buttonVariants())}
            >
              {pending ? "Updating..." : "Update"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

