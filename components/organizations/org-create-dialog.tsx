"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"

import { createOrganization } from "@/app/actions/organizations"
import { orgNameSchema } from "@/lib/validation/organizations"
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
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type OrgCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrgCreateDialog({ open, onOpenChange }: OrgCreateDialogProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  function validateName(value: string) {
    const result = orgNameSchema.safeParse(value)
    if (!result.success) {
      setNameError(result.error.issues[0]?.message || "Invalid name")
      return false
    }
    setNameError(null)
    return true
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    setNameError(null)

    const name = (formData.get("name") as string)?.trim() || ""
    const description = (formData.get("description") as string)?.trim() || undefined

    if (!validateName(name)) return

    startTransition(async () => {
      const result = await createOrganization({ name, description })

      if (!result.success) {
        setError(result.error)
        return
      }

      onOpenChange(false)
      router.push(`/${result.data.slug}`)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)]">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Create Organization
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Set up a new organization for your team.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form action={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="org-name"
              className="text-xs font-semibold uppercase text-muted-foreground tracking-wider"
            >
              Organization Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              name="name"
              required
              placeholder="e.g. Acme Academy"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "org-name-error" : undefined}
              className={cn(
                "h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base",
                nameError && "border-destructive focus-visible:ring-destructive"
              )}
              onChange={(e) => {
                if (nameError) validateName(e.target.value)
              }}
            />
            {nameError && (
              <p id="org-name-error" className="text-xs text-destructive">
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="org-description"
              className="text-xs font-semibold uppercase text-muted-foreground tracking-wider"
            >
              Description
            </Label>
            <Textarea
              id="org-description"
              name="description"
              placeholder="What is this organization about?"
              rows={3}
              maxLength={500}
              className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
            />
            <p className="text-xs text-muted-foreground">Optional, max 500 characters.</p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-muted-foreground hover:text-foreground"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(
                buttonVariants(),
                "min-w-[140px] shadow-md hover:shadow-lg transition-all",
                pending && "opacity-80"
              )}
            >
              {pending ? "Creating..." : "Create Organization"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
