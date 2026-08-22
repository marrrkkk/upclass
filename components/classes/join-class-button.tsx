"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"

import { joinClass } from "@/app/actions/classes"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { Field, FieldHelp, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"

type JoinClassButtonProps = {
  iconOnly?: boolean
}

export function JoinClassButton({ iconOnly = false }: JoinClassButtonProps) {
  const router = useRouter()
  const organizationPath = useOrganizationPath()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleJoin = async (formData: FormData) => {
    setError(null)

    startTransition(async () => {
      const joinResult = await executeWithOfflineHandling(
        () => joinClass(formData),
        "join-class",
        { code: String(formData.get("code") || "") },
      )

      if (joinResult.queued) {
        setError("Action queued. It will be synced when you're back online.")
        setTimeout(() => setOpen(false), 2000)
        return
      }

      if (!joinResult.success) {
        setError(joinResult.error || "Failed to join class")
        return
      }

      setOpen(false)
      if ("classId" in joinResult && joinResult.classId) {
        router.push(organizationPath(`/classes/${joinResult.classId}`))
      }
    })
  }

  return (
    <>
      <Button
        size={iconOnly ? "icon" : "default"}
        variant="secondary"
        type="button"
        title="Join class"
        aria-label={iconOnly ? "Join class" : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="font-semibold border border-hairline/80 shadow-2xs"
      >
        <UserPlus aria-hidden="true" className="size-4" />
        {!iconOnly ? <span>Join class</span> : null}
      </Button>
      <ResponsiveOverlay
        open={open}
        onOpenChange={setOpen}
        title={
          <span className="flex items-center gap-2">
            <IconBadge tone="primary" size="sm">
              <UserPlus />
            </IconBadge>
            Join a class
          </span>
        }
        description="Enter the six-character code provided by your teacher."
        desktopClassName="sm:max-w-[28rem]"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="join-class-form" isLoading={pending} disabled={pending}>
              Join class
            </Button>
          </>
        }
      >
        <form id="join-class-form" action={handleJoin} className="space-y-5">
          <Field>
            <FieldLabel htmlFor="code">Class code</FieldLabel>
            <Input
              id="code"
              name="code"
              required
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              className="type-mono text-center text-lg font-bold uppercase"
              onChange={(event) => {
                event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
              }}
            />
            <FieldHelp>Ask your teacher for the class code.</FieldHelp>
          </Field>

          {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
        </form>
      </ResponsiveOverlay>
    </>
  )
}
