"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Settings, Plus, Trash2 } from "lucide-react"
import { updateClass, deleteClass } from "@/app/actions/classes"
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
  trigger?: React.ReactNode
}

export function ClassSettingsDialog({ classData, trigger }: ClassSettingsDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [selectedColor, setSelectedColor] = useState(classData.color || "#3b82f6")

  // Parse initial schedule data
  const parseSchedule = (scheduleStr: string | null) => {
    if (!scheduleStr) return { days: [], time: "" }

    try {
      // Expected format: "Mon, Wed 10:00 AM" or similar
      const parts = scheduleStr.trim().split(' ')
      const timePart = parts.slice(-2).join(' ') // "10:00 AM"
      const daysPart = parts.slice(0, -2).join(' ').replace(/,/g, '').split(' ') // ["Mon", "Wed"]

      // Convert 12h to 24h for input type="time"
      const date = new Date(`2000-01-01 ${timePart}`)
      const time24 = !isNaN(date.getTime())
        ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : ""

      return {
        days: daysPart.filter(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(d)),
        time: time24
      }
    } catch (e) {
      return { days: [], time: "" }
    }
  }

  const initialSchedule = parseSchedule(classData.schedule)
  const [selectedDays, setSelectedDays] = useState<string[]>(initialSchedule.days)
  const [selectedTime, setSelectedTime] = useState(initialSchedule.time)

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

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteClass(classData.id)
      if (!res.success) {
        setError(res.error)
        setDeleteDialogOpen(false)
        return
      }
      setDeleteDialogOpen(false)
      setOpen(false)
      router.push("/classes")
    })
  }

  // Predefined premium colors
  const premiumColors = [
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#f97316", // Orange
    "#eab308", // Yellow
    "#10b981", // Emerald
    "#06b6d4", // Cyan
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-10 w-10 rounded-lg bg-background/50 backdrop-blur-sm border-white/20 hover:bg-white/10 transition-all")}
            type="button"
            title="Class settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 shrink-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">Class Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update your class information and appearance.
          </DialogDescription>
        </DialogHeader>
        <form action={handleUpdate} className="p-6 space-y-6 flex-1 min-h-0">
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Title</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={classData.title}
                placeholder="e.g. Mastering UI Design"
                className="h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Category</Label>
                <Input
                  id="category"
                  name="category"
                  defaultValue={classData.category || ""}
                  placeholder="e.g. UI/UX"
                  className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Schedule</Label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSelectedDays(prev =>
                            prev.includes(day)
                              ? prev.filter(d => d !== day)
                              : [...prev, day]
                          )
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all",
                          selectedDays.includes(day)
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors w-full"
                    />
                  </div>
                  <input
                    type="hidden"
                    name="schedule"
                    value={
                      selectedDays.length > 0 && selectedTime
                        ? `${selectedDays.join(', ')} ${new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                        : ""
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={classData.description || ""}
                placeholder="What will learners get from this class?"
                rows={3}
                className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="settings-color" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Theme Color</Label>
              <div className="flex flex-wrap gap-3">
                {premiumColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                      selectedColor === color ? "border-foreground ring-2 ring-offset-2 ring-foreground/20" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                <div className="relative ml-2">
                  <input
                    type="color" // Hidden color input
                    id="settings-custom-color"
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  <div className="flex items-center justify-center h-8 w-8 rounded-full border border-dashed border-muted-foreground/50 hover:bg-muted text-muted-foreground">
                    <Plus className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <input type="hidden" name="color" value={selectedColor} />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
              {error}
            </div>
          )}

          {/* Danger Zone */}
          <div className="border-t border-destructive/20 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-destructive">Danger Zone</p>
                <p className="text-xs text-muted-foreground">Permanently delete this class</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "gap-2")}
              >
                <Trash2 className="h-4 w-4" />
                Delete Class
              </button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants(), "min-w-[100px] shadow-md hover:shadow-lg transition-all", pending && "opacity-80")}
            >
              {pending ? "Updating..." : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)]">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border-b border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Delete Class</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete
            </p>
            <p className="text-lg font-semibold text-foreground truncate">
              {classData.title}
            </p>
            <p className="text-xs text-muted-foreground">
              All announcements, classwork, quizzes, and student submissions will be deleted.
            </p>
          </div>

          <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePending}
              className={cn(buttonVariants({ variant: "outline" }), "min-w-[100px]")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePending}
              className={cn(buttonVariants({ variant: "destructive" }), "min-w-[120px] gap-2")}
            >
              {deletePending ? (
                "Deleting..."
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Class
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
