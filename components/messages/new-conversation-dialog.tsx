"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
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

type NewConversationDialogProps = {
  currentUserId: string
}

export function NewConversationDialog({ currentUserId }: NewConversationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSearch = async () => {
    setError(null)
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError("Please enter an email address")
      return
    }

    startTransition(async () => {
      // Find user by email
      try {
        const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(trimmedEmail)}`)
        if (!response.ok) {
          setError("User not found")
          return
        }
        const data = await response.json()
        if (data.userId === currentUserId) {
          setError("Cannot message yourself")
          return
        }
        setOpen(false)
        setEmail("")
        router.push(`/messages/${data.userId}`)
      } catch (err) {
        setError("Failed to find user")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(buttonVariants({ size: "sm" }), "gap-2 shadow-sm transition-all hover:shadow-md")}
          type="button"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">Start New Conversation</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Connect with other users by entering their email address.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-2 space-y-6 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Email Address</Label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearch()
                    }
                  }}
                  className="pl-10 h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base"
                  disabled={pending}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setEmail("")
                setError(null)
              }}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSearch}
              disabled={pending || !email.trim()}
              className={cn(buttonVariants(), "min-w-[100px] shadow-md hover:shadow-lg transition-all", pending && "opacity-80")}
            >
              {pending ? "Searching..." : "Start Chat"}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

