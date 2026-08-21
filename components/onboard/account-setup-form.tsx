"use client"

import * as React from "react"
import { ArrowRight, UserRound } from "lucide-react"

import { completeAccountSetup } from "@/app/actions/onboarding"
import { trackOnboardingEvent } from "@/lib/analytics/onboarding-events"
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

type AccountSetupFormProps = {
  initialName?: string | null
  returnTo?: string
  onComplete?: () => void
}

export function AccountSetupForm({ initialName = "", returnTo, onComplete }: AccountSetupFormProps) {
  const [name, setName] = React.useState(initialName?.trim() ?? "")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => {
    trackOnboardingEvent("onboarding_started", { entrySource: "account_setup" })
  }, [])

  const canSubmit = name.trim().length >= 2 && !pending

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setError(null)
    startTransition(async () => {
      const result = await completeAccountSetup({ name: name.trim() })
      if (!result.success) {
        setError(result.error)
        return
      }

      trackOnboardingEvent("account_setup_completed", { entrySource: "account_setup" })

      if (onComplete) {
        onComplete()
        return
      }

      if (returnTo) {
        window.location.href = returnTo
        return
      }

      window.location.href = "/org"
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      <Panel padding="none" className="animate-rise overflow-hidden">
        <PanelHeader>
          <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
            <IconBadge tone="primary" size="md">
              <UserRound />
            </IconBadge>
            <div className="min-w-0 space-y-0.5">
              <PanelTitle>What should we call you?</PanelTitle>
              <PanelDescription>
                Add a display name so classmates and teachers recognize you.
              </PanelDescription>
            </div>
          </PanelHeading>
        </PanelHeader>

        <PanelBody className="space-y-6 p-5 sm:p-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="display-name">Display name</FieldLabel>
              <Input
                id="display-name"
                value={name}
                autoFocus
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                disabled={pending}
                placeholder="Alex Rivera"
                onChange={(event) => setName(event.target.value)}
              />
              <FieldHelp id="display-name-help">
                You can add a photo and bio later in Settings.
              </FieldHelp>
            </Field>
          </FieldGroup>

          {error ? (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          ) : null}
        </PanelBody>

        <PanelFooter className="justify-end">
          <Button type="submit" isLoading={pending} disabled={!canSubmit}>
            Continue
            {!pending ? <ArrowRight aria-hidden="true" /> : null}
          </Button>
        </PanelFooter>
      </Panel>
    </form>
  )
}
