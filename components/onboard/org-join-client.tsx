"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { joinOrganizationAndClassByCode } from "@/app/actions/classes"
import { joinOrganizationByInvite } from "@/app/actions/organization"
import { trackOnboardingEvent } from "@/lib/analytics/onboarding-events"
import { OrgJoinForm } from "@/components/onboard/org-join-form"
import { OrgOnboardingShell } from "@/components/onboard/org-onboarding-shell"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { Field, FieldLabel } from "@/components/ui/field"
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
import { IconBadge } from "@/components/ui/icon-badge"
import { KeyRound, ArrowRight } from "lucide-react"

type OrgJoinClientProps = {
  viewer: { name?: string | null; email?: string | null }
  initialToken?: string
  initialClassCode?: string
  error?: string
}

export function OrgJoinClient({
  viewer,
  initialToken = "",
  initialClassCode = "",
  error: initialError,
}: OrgJoinClientProps) {
  const router = useRouter()
  const [mode, setMode] = React.useState<"org" | "class">(
    initialClassCode ? "class" : "org",
  )
  const [error, setError] = React.useState<string | null>(initialError ?? null)
  const [pending, startTransition] = React.useTransition()
  const [classCode, setClassCode] = React.useState(initialClassCode)
  const autoJoinAttempted = React.useRef(false)

  const joinByClassCode = React.useCallback(
    (code: string) => {
      setError(null)
      startTransition(async () => {
        const result = await joinOrganizationAndClassByCode({ code })
        if (!result.success) {
          setError(result.error)
          return
        }
        if (!result.data) {
          setError("Failed to join class")
          return
        }

        trackOnboardingEvent("class_joined", {
          entrySource: "class_code",
          organizationId: undefined,
          role: "student",
        })

        router.push(`/${result.data.orgSlug}/classes/${result.data.classId}?welcome=1`)
      })
    },
    [router],
  )

  React.useEffect(() => {
    if (!initialClassCode || autoJoinAttempted.current) return
    autoJoinAttempted.current = true
    joinByClassCode(initialClassCode)
  }, [initialClassCode, joinByClassCode])

  const handleOrgJoin = (values: { code: string }) => {
    setError(null)
    startTransition(async () => {
      const result = await joinOrganizationByInvite({ token: values.code })
      if (!result.success) {
        setError(result.error)
        return
      }
      if (!result.data) {
        setError("Failed to join organization")
        return
      }
      router.push(`/${result.data.orgSlug}/dashboard`)
    })
  }

  const handleClassJoin = (event: React.FormEvent) => {
    event.preventDefault()
    if (!classCode.trim()) return
    joinByClassCode(classCode.trim().toUpperCase())
  }

  if (mode === "org") {
    return (
      <OrgOnboardingShell width="content">
        <OrgJoinForm
          pending={pending}
          error={error}
          initialCode={initialToken}
          viewerEmail={viewer.email}
          onBack={() => router.push("/org")}
          onSubmit={handleOrgJoin}
        />
        <div className="mt-4 text-center">
          <Button type="button" variant="link" onClick={() => setMode("class")}>
            Have a class code instead?
          </Button>
        </div>
      </OrgOnboardingShell>
    )
  }

  return (
    <OrgOnboardingShell width="content">
      <form onSubmit={handleClassJoin} noValidate>
        <Panel padding="none" className="animate-rise overflow-hidden">
          <PanelHeader>
            <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
              <IconBadge tone="info" size="md">
                <KeyRound />
              </IconBadge>
              <div className="min-w-0 space-y-0.5">
                <PanelTitle>Join a class</PanelTitle>
                <PanelDescription>
                  Enter the 6-character code from your teacher. You will join the workspace automatically.
                </PanelDescription>
              </div>
            </PanelHeading>
            <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/org")} disabled={pending}>
              Back
            </Button>
          </PanelHeader>
          <PanelBody className="space-y-6 p-5 sm:p-6">
            <Field>
              <FieldLabel htmlFor="class-code">Class code</FieldLabel>
              <Input
                id="class-code"
                value={classCode}
                autoFocus={!initialClassCode}
                spellCheck={false}
                autoCapitalize="characters"
                autoComplete="off"
                required
                maxLength={6}
                disabled={pending}
                placeholder="ABC123"
                className="type-mono h-10 uppercase tracking-widest"
                onChange={(event) => setClassCode(event.target.value.toUpperCase())}
              />
            </Field>
            {viewer.email ? (
              <Callout tone="info" icon={false}>
                Joining as {viewer.email}
              </Callout>
            ) : null}
            {error ? (
              <Callout tone="danger" role="alert">
                {error}
              </Callout>
            ) : null}
          </PanelBody>
          <PanelFooter className="justify-end">
            <Button type="submit" isLoading={pending} disabled={classCode.trim().length < 6 || pending}>
              Join class
              {!pending ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </PanelFooter>
        </Panel>
      </form>
      <div className="mt-4 text-center">
        <Button type="button" variant="link" onClick={() => setMode("org")}>
          Have an organization invite instead?
        </Button>
      </div>
    </OrgOnboardingShell>
  )
}
