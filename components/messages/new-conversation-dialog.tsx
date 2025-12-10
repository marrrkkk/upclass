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
        router.push(`/home/messages/${data.userId}`)
      } catch (err) {
        setError("Failed to find user")
      }
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
          New Conversation
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Enter the email address of the user you want to message.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
                className="pl-10"
                disabled={pending}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setEmail("")
              setError(null)
            }}
            className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSearch}
            disabled={pending || !email.trim()}
            className={cn(buttonVariants())}
          >
            {pending ? "Searching..." : "Start Conversation"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

