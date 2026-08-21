"use client"

import * as React from "react"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldHelp, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
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
 * Invite composer for the admin rail.
 *
 * Stacked so it sits beside People / Classes / Invitations without competing
 * with the directory table.
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
    <form onSubmit={submit} noValidate>
      <FieldGroup>
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
              <SelectGroup>
                <SelectItem value="student">{ORG_ROLE_LABELS.student}</SelectItem>
                <SelectItem value="teacher">{ORG_ROLE_LABELS.teacher}</SelectItem>
                {currentRole === "owner" ? (
                  <SelectItem value="admin">{ORG_ROLE_LABELS.admin}</SelectItem>
                ) : null}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldHelp>
            {ORG_ROLE_LABELS[role]} {ORG_ROLE_DESCRIPTIONS[role].toLowerCase()}. Invites expire after 7 days.
          </FieldHelp>
        </Field>

        <Button type="submit" isLoading={pending} disabled={!canSubmit} className="w-full">
          {!pending ? <Send data-icon="inline-start" /> : null}
          Send invite
        </Button>
      </FieldGroup>
    </form>
  )
}
