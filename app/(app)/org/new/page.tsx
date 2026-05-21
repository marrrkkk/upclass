"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"

import { createOrganization } from "@/app/actions/organizations"
import { orgNameSchema } from "@/lib/validation/organizations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function CreateOrganizationPage() {
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

      router.push(`/${result.data.slug}`)
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-lg p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Create Organization
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up a new organization for your school or institution.
            </p>
          </div>
        </div>

        <form action={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">
              Organization Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              name="name"
              required
              placeholder="e.g. Acme Academy"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "org-name-error" : undefined}
              className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="org-description">Description</Label>
            <Textarea
              id="org-description"
              name="description"
              placeholder="What is this organization about?"
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">Optional, max 500 characters.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/")}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
