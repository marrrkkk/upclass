"use client"

import { useState, useTransition } from "react"
import { UserPlus } from "lucide-react"
import { joinClass } from "@/app/actions/classes"
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

export function JoinClassButton() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleJoin = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await joinClass(formData)
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
          className={cn(buttonVariants({ size: "sm" }), "gap-2 bg-blue-600 hover:bg-blue-700")}
          type="button"
        >
          <UserPlus className="h-4 w-4" />
          Join class
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Join a Class</DialogTitle>
          <DialogDescription>
            Enter the class code provided by your teacher to join the class.
          </DialogDescription>
        </DialogHeader>
        <form action={handleJoin} className="space-y-4">
          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Class Code</span>
            <input
              name="code"
              required
              placeholder="e.g. ABC123"
              maxLength={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase outline-none ring-offset-background placeholder:text-muted-foreground placeholder:normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              style={{ textTransform: "uppercase" }}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
              }}
            />
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
              className={cn(buttonVariants(), "bg-blue-600 hover:bg-blue-700 disabled:opacity-70")}
            >
              {pending ? "Joining..." : "Join"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

