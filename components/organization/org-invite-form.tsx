"use client"

import * as React from "react"
import { Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"
import { Button } from "@/components/ui/button"
import { Field, FieldHelp, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ORG_ROLE_DESCRIPTIONS,
  ORG_ROLE_LABELS,
  type AssignableOrgRole,
  type OrgRole,
} from "@/types/organization"

type OrgInviteFormProps = {
  /** The acting user's role — only owners can invite administrators. */
  currentRole: Extract<OrgRole, "owner" | "admin">
  pending: boolean
  onSubmit: (values: { email: string; role: AssignableOrgRole }) => void
}

/**
 * Invite composer.
 *
 * Laid out as a single row on desktop and a stack on mobile, with the access
 * level's meaning spelled out under the control rather than hidden in a tooltip.
 */
export function OrgInviteForm({ currentRole, pending, onSubmit }: OrgInviteFormProps) {
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<AssignableOrgRole>("student")

  const canSubmit = email.trim().length > 0 && !pending

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ email: email.trim(), role })
    setEmail("")
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
        <Field>
          <FieldLabel htmlFor="invite-email">Email address</FieldLabel>
          <Input
            id="invite-email"
            type="email"
            value={email}
            autoComplete="off"
            placeholder="teacher@school.edu"
            disabled={pending}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="invite-role">Access</FieldLabel>
          <Select
            value={role}
            disabled={pending}
            onValueChange={(value) => setRole(value as AssignableOrgRole)}
          >
            <SelectTrigger id="invite-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="student">{ORG_ROLE_LABELS.student}</SelectItem>
              <SelectItem value="teacher">{ORG_ROLE_LABELS.teacher}</SelectItem>
              {currentRole === "owner" ? (
                <SelectItem value="admin">{ORG_ROLE_LABELS.admin}</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </Field>

        <Button type="submit" isLoading={pending} disabled={!canSubmit} className="w-full sm:w-auto">
          {!pending ? <Send aria-hidden="true" /> : null}
          Send invite
        </Button>
      </div>

      <FieldHelp className={cn(typographyVariants({ variant: "caption", tone: "muted" }))}>
        <span className="font-medium text-foreground">{ORG_ROLE_LABELS[role]}</span>{" "}
        {ORG_ROLE_DESCRIPTIONS[role].toLowerCase()}. Invites expire after 7 days.
      </FieldHelp>
    </form>
  )
}
