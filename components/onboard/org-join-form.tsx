"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react"

import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { Field, FieldGroup, FieldHelp, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import {
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelHeading,
  PanelTitle,
  PanelDescription,
} from "@/components/ui/panel"

type OrgJoinFormProps = {
  pending: boolean
  error: string | null
  /** Prefilled from `?token=` when the user arrives from an invite link. */
  initialCode?: string
  /** Signed-in address, shown because invites are bound to a specific email. */
  viewerEmail?: string | null
  onBack: () => void
  onSubmit: (values: { code: string }) => void
}

/**
 * Join-workspace step.
 *
 * Surfacing the signed-in email up front matters: invites are email-bound, and
 * "wrong account" is the most common reason a valid code appears to fail.
 */
export function OrgJoinForm({
  pending,
  error,
  initialCode = "",
  viewerEmail,
  onBack,
  onSubmit,
}: OrgJoinFormProps) {
  const [code, setCode] = React.useState(initialCode)
  const canSubmit = code.trim().length > 0 && !pending

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ code: code.trim() })
  }

  return (
    <form onSubmit={submit} noValidate>
      <Panel padding="none" className="animate-rise overflow-hidden">
        <PanelHeader>
          <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
            <IconBadge tone="info" size="md">
              <KeyRound />
            </IconBadge>
            <div className="min-w-0 space-y-0.5">
              <PanelTitle>Join an organization</PanelTitle>
              <PanelDescription>Paste the invite code you were sent.</PanelDescription>
            </div>
          </PanelHeading>
          <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={pending}>
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
        </PanelHeader>

        <PanelBody className="space-y-6 p-5 sm:p-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-code">Invite code</FieldLabel>
              <Input
                id="invite-code"
                value={code}
                autoFocus
                spellCheck={false}
                autoCapitalize="none"
                autoComplete="off"
                required
                aria-describedby="invite-code-help"
                placeholder="8f9a2b1c4d5e6f70"
                disabled={pending}
                className="type-mono h-10"
                onChange={(event) => setCode(event.target.value)}
              />
              <FieldHelp id="invite-code-help">
                Ask your teacher or administrator if you do not have one yet.
              </FieldHelp>
            </Field>
          </FieldGroup>

          {viewerEmail ? (
            <div className="panel-sunken flex items-start gap-3 p-4">
              <IconBadge tone="neutral" size="sm" className="mt-0.5">
                <Mail />
              </IconBadge>
              <div className="min-w-0 space-y-0.5">
                <p className={typographyVariants({ variant: "h4" })}>Joining as {viewerEmail}</p>
                <p className={cn(typographyVariants({ variant: "small", tone: "muted" }))}>
                  Invites only work for the address they were sent to. Sign in with that account if
                  the code is rejected.
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          ) : null}
        </PanelBody>

        <PanelFooter className="justify-end">
          <div className="flex w-full gap-3 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={pending}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={pending} disabled={!canSubmit} className="flex-1 sm:flex-none">
              Join organization
              {!pending ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </div>
        </PanelFooter>
      </Panel>
    </form>
  )
}
