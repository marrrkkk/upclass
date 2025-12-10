"use client"

import { useState, useTransition } from "react"
import { UserPlus } from "lucide-react"
import { joinClass } from "@/app/actions/classes"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
          className={cn(buttonVariants({ size: "sm" }), "gap-2 shadow-sm transition-all hover:shadow-md")}
          type="button"
        >
          <UserPlus className="h-4 w-4" />
          Join class
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden border-0 shadow-2xl">
        <DialogHeader className="p-6 pb-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">Join a Class</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the 6-character class code provided by your teacher.
          </DialogDescription>
        </DialogHeader>

        <form action={handleJoin} className="p-6 pt-2 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-center">
              <Input
                id="code"
                name="code"
                required
                placeholder="ABC123"
                maxLength={6}
                className="uppercase text-center text-3xl tracking-[0.5em] font-mono h-16 w-64 border-2 border-muted-foreground/20 focus-visible:border-primary focus-visible:ring-0 transition-all bg-muted/20 focus-visible:bg-background rounded-xl placeholder:text-muted-foreground/30"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                }}
              />
            </div>
            <Label htmlFor="code" className="sr-only">Class Code</Label>
            <p className="text-xs text-center text-muted-foreground">
              Ask your teacher for the class code to enter above.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2 text-center">
              {error}
            </div>
          )}

          <DialogFooter className="sm:justify-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground w-full sm:w-auto")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants(), "min-w-[120px] shadow-md hover:shadow-lg transition-all w-full sm:w-auto", pending && "opacity-80")}
            >
              {pending ? "Joining..." : "Join Class"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

