"use client"

import { useState, useTransition } from "react"
import { Mail } from "lucide-react"
import { createInvitation } from "@/app/actions/org-invitations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OrgRole } from "@/lib/validation/organizations"

type InviteMemberDialogProps = {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteMemberDialog({
  orgId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<OrgRole>("student")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function resetForm() {
    setEmail("")
    setRole("student")
    setError(null)
    setSuccess(null)
    setEmailError(null)
  }

  function validateEmail(value: string): boolean {
    if (!value.trim()) {
      setEmailError("Email is required")
      return false
    }
    // Basic email validation pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address")
      return false
    }
    setEmailError(null)
    return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateEmail(email)) {
      return
    }

    startTransition(async () => {
      const result = await createInvitation(orgId, email, role)

      if (!result.success) {
        setError(result.error || "Failed to send invitation")
        return
      }

      setSuccess(`Invitation sent to ${email}`)
      setTimeout(() => {
        resetForm()
        onOpenChange(false)
      }, 1500)
    })
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      resetForm()
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        <DialogHeader className="p-6 pb-2 text-center shrink-0">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Invite a Member
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Send an email invitation to join this organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6 flex-1 min-h-0">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) {
                    validateEmail(e.target.value)
                  }
                }}
                onBlur={() => {
                  if (email) validateEmail(email)
                }}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "invite-email-error" : undefined}
              />
              {emailError && (
                <p
                  id="invite-email-error"
                  className="text-sm text-destructive font-medium animate-in fade-in slide-in-from-bottom-1"
                >
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/20 animate-in fade-in slide-in-from-bottom-2 text-center">
              {success}
            </div>
          )}

          <DialogFooter className="sm:justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="text-muted-foreground hover:text-foreground w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="min-w-[120px] shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
            >
              {pending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
