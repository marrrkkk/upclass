"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"

import { createClass } from "@/app/actions/classes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"
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

type CreateClassButtonProps = {
  iconOnly?: boolean
}

export function CreateClassButton({ iconOnly = false }: CreateClassButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selectedColor, setSelectedColor] = useState("#3b82f6")
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState("")

  const handleCreate = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await executeWithOfflineHandling(
        () => createClass(formData),
        "create-class",
        {
          title: String(formData.get("title") || ""),
          description: String(formData.get("description") || ""),
          category: String(formData.get("category") || ""),
          color: String(formData.get("color") || ""),
          schedule: String(formData.get("schedule") || ""),
        },
      )

      if (res.queued) {
        setError("Action queued. It will be synced when you're back online.")
        setTimeout(() => setOpen(false), 2000)
        return
      }

      if (!res.success) {
        setError(res.error || "Failed to create class")
        return
      }

      setOpen(false)
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
        <Button
          size={iconOnly ? "icon" : "sm"}
          className={cn(
            iconOnly ? "" : "gap-2",
            "shadow-sm transition-all hover:shadow-md"
          )}
          type="button"
          title="Create class"
        >
          <Plus className="h-4 w-4" />
          {!iconOnly && <span>Create class</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 shrink-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">Create New Class</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up a new space for your students to learn and collaborate.
          </DialogDescription>
        </DialogHeader>

        <form action={handleCreate} className="p-6 space-y-6 flex-1 min-h-0">
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Class Name</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="e.g. Advanced UI/UX Principles"
                className="h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Subject / Category</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="e.g. Design"
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
                placeholder="Briefly describe what students will learn..."
                rows={3}
                className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="color" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Theme Color</Label>
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
                    type="color" // Hidden color input for custom selection if needed, though strictly simpler UI is better
                    id="custom-color"
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

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={pending}
              className="min-w-[100px] shadow-md hover:shadow-lg transition-all"
            >
              {pending ? "Creating..." : "Create Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
