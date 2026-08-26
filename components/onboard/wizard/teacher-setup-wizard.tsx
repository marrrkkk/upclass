"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  KeyRound,
  RefreshCw,
  Share2,
} from "lucide-react"

import { createOrganization } from "@/app/actions/organization"
import { createClass, regenerateClassEnrollmentCode, setClassEnrollmentCodeEnabled } from "@/app/actions/classes"
import { completeTeacherSetupStep } from "@/app/actions/onboarding"
import { OrgCreateForm, slugify } from "@/components/onboard/org-create-form"
import { SetupStepper, type SetupStep } from "@/components/onboard/wizard/setup-stepper"
import { SetupSummaryRail, type SetupSummaryItem } from "@/components/onboard/wizard/setup-summary-rail"
import { OrgOnboardingShell } from "@/components/onboard/org-onboarding-shell"
import { trackOnboardingEvent } from "@/lib/analytics/onboarding-events"
import { TEACHER_SETUP_STEPS, type TeacherSetupStep } from "@/lib/onboarding/constants"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { CopyButton } from "@/components/ui/copy-button"
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
import { Text } from "@/components/ui/typography"
import type { OnboardingStateRow } from "@/app/actions/onboarding"

const WIZARD_STEPS: SetupStep[] = [
  { id: "workspace", label: "Workspace" },
  { id: "class", label: "First class" },
  { id: "invite", label: "Invite learners" },
  { id: "finish", label: "Finish" },
]

type TeacherSetupWizardProps = {
  resumeOrg?: {
    id: string
    name: string
    slug: string
    description?: string | null
  } | null
  initialState?: OnboardingStateRow | null
}

type WizardState = {
  step: TeacherSetupStep
  orgId?: string
  orgSlug?: string
  orgName?: string
  orgDescription?: string
  classId?: string
  classTitle?: string
  classCategory?: string
  enrollmentCode?: string
  codeEnabled?: boolean
  inviteSkipped?: boolean
}

function stepFromState(state?: OnboardingStateRow | null, resumeOrg?: TeacherSetupWizardProps["resumeOrg"]): WizardState {
  const metadata = (state?.metadata ?? {}) as Record<string, unknown>
  const completed = new Set(state?.completedSteps ?? [])

  let step: TeacherSetupStep = "workspace"
  if (completed.has("invite") || completed.has("finish")) step = "finish"
  else if (completed.has("class")) step = "invite"
  else if (completed.has("workspace") || resumeOrg) step = "class"

  if (state?.currentStep && TEACHER_SETUP_STEPS.includes(state.currentStep as TeacherSetupStep)) {
    step = state.currentStep as TeacherSetupStep
  }

  return {
    step,
    orgId: resumeOrg?.id ?? (metadata.orgId as string | undefined),
    orgSlug: resumeOrg?.slug ?? (metadata.orgSlug as string | undefined),
    orgName: resumeOrg?.name ?? (metadata.orgName as string | undefined),
    orgDescription: resumeOrg?.description ?? (metadata.orgDescription as string | undefined),
    classId: metadata.classId as string | undefined,
    classTitle: metadata.classTitle as string | undefined,
    classCategory: metadata.classCategory as string | undefined,
    enrollmentCode: metadata.enrollmentCode as string | undefined,
    codeEnabled: metadata.codeEnabled as boolean | undefined,
    inviteSkipped: metadata.inviteSkipped as boolean | undefined,
  }
}

export function TeacherSetupWizard({ resumeOrg, initialState }: TeacherSetupWizardProps) {
  const router = useRouter()
  const [wizard, setWizard] = React.useState<WizardState>(() => stepFromState(initialState, resumeOrg))
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const [classTitle, setClassTitle] = React.useState(wizard.classTitle ?? "")
  const [classCategory, setClassCategory] = React.useState(wizard.classCategory ?? "General")

  React.useEffect(() => {
    trackOnboardingEvent("onboarding_started", {
      entrySource: resumeOrg ? "resume_org_setup" : "create_org",
      organizationId: resumeOrg?.id,
    })
  }, [resumeOrg?.id])

  const completedSteps = React.useMemo(() => {
    const done: string[] = []
    if (wizard.orgId) done.push("workspace")
    if (wizard.classId) done.push("class")
    if (wizard.enrollmentCode || wizard.inviteSkipped) done.push("invite")
    if (wizard.step === "finish") done.push("finish")
    return done
  }, [wizard])

  const summaryItems: SetupSummaryItem[] = [
    {
      label: "Workspace",
      value: wizard.orgName ? `${wizard.orgName} · /${wizard.orgSlug}` : undefined,
      status: wizard.orgId ? "complete" : "pending",
    },
    {
      label: "First class",
      value: wizard.classTitle,
      status: wizard.classId ? "complete" : wizard.orgId ? "pending" : undefined,
    },
    {
      label: "Enrollment invite",
      value: wizard.inviteSkipped
        ? "Skipped for now"
        : wizard.enrollmentCode
          ? wizard.codeEnabled === false
            ? `${wizard.enrollmentCode} (disabled)`
            : wizard.enrollmentCode
          : undefined,
      status: wizard.inviteSkipped ? "skipped" : wizard.enrollmentCode ? "complete" : wizard.classId ? "pending" : undefined,
    },
  ]

  const persistStep = async (
    step: TeacherSetupStep,
    metadata: Record<string, unknown>,
    options?: { markCompleted?: boolean },
  ) => {
    if (!wizard.orgId) return
    await completeTeacherSetupStep({
      orgId: wizard.orgId,
      step,
      metadata: {
        orgId: wizard.orgId,
        orgSlug: wizard.orgSlug,
        orgName: wizard.orgName,
        orgDescription: wizard.orgDescription,
        classId: wizard.classId,
        classTitle: wizard.classTitle,
        classCategory: wizard.classCategory,
        enrollmentCode: wizard.enrollmentCode,
        codeEnabled: wizard.codeEnabled,
        inviteSkipped: wizard.inviteSkipped,
        ...metadata,
      },
    })
    if (options?.markCompleted) {
      trackOnboardingEvent("onboarding_completed", {
        organizationId: wizard.orgId,
        role: "teacher",
      })
    }
  }

  const handleCreateOrg = (values: {
    name: string
    slug: string
    description: string
    logo?: string | null
    cover?: string | null
  }) => {
    setError(null)
    startTransition(async () => {
      const result = await createOrganization(values)
      if (!result.success) {
        setError(result.error)
        return
      }
      if (!result.data) {
        setError("Failed to create organization")
        return
      }

      trackOnboardingEvent("organization_created", { organizationId: result.data.orgId })

      const next: WizardState = {
        step: "class",
        orgId: result.data.orgId,
        orgSlug: result.data.slug,
        orgName: values.name,
        orgDescription: values.description,
      }
      setWizard(next)
      await completeTeacherSetupStep({
        orgId: result.data.orgId,
        step: "workspace",
        metadata: {
          orgId: result.data.orgId,
          orgSlug: result.data.slug,
          orgName: values.name,
          orgDescription: values.description,
        },
      })
    })
  }

  const handleCreateClass = (event: React.FormEvent) => {
    event.preventDefault()
    if (!wizard.orgSlug || classTitle.trim().length === 0) return

    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append("orgSlug", wizard.orgSlug!)
      formData.append("title", classTitle.trim())
      formData.append("category", classCategory.trim() || "General")

      const result = await createClass(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      if (!result.data) {
        setError("Failed to create class")
        return
      }

      trackOnboardingEvent("class_created", { organizationId: wizard.orgId })

      const next: WizardState = {
        ...wizard,
        step: "invite",
        classId: result.data.classId,
        classTitle: classTitle.trim(),
        classCategory: classCategory.trim() || "General",
        enrollmentCode: result.data.code,
        codeEnabled: result.data.codeEnabled,
      }
      setWizard(next)
      await persistStep("class", {
        classId: result.data.classId,
        classTitle: classTitle.trim(),
        classCategory: classCategory.trim() || "General",
        enrollmentCode: result.data.code,
        codeEnabled: result.data.codeEnabled,
      })
    })
  }

  const enrollmentLink =
    typeof window !== "undefined" && wizard.enrollmentCode
      ? `${window.location.origin}/org/join?code=${wizard.enrollmentCode}`
      : ""

  const handleRegenerateCode = () => {
    if (!wizard.classId) return
    setError(null)
    startTransition(async () => {
      const result = await regenerateClassEnrollmentCode(wizard.classId!)
      if (!result.success) {
        setError(result.error)
        return
      }
      if (!result.data) {
        setError("Failed to regenerate code")
        return
      }
      setWizard((current) => ({ ...current, enrollmentCode: result.data!.code, codeEnabled: true }))
      await persistStep("invite", { enrollmentCode: result.data.code, codeEnabled: true })
    })
  }

  const handleToggleCode = (enabled: boolean) => {
    if (!wizard.classId) return
    setError(null)
    startTransition(async () => {
      const result = await setClassEnrollmentCodeEnabled(wizard.classId!, enabled)
      if (!result.success) {
        setError(result.error)
        return
      }
      setWizard((current) => ({ ...current, codeEnabled: enabled }))
      await persistStep("invite", { codeEnabled: enabled })
    })
  }

  const handleSkipInvite = () => {
    setError(null)
    startTransition(async () => {
      trackOnboardingEvent("onboarding_skipped", { step: "invite", organizationId: wizard.orgId })
      const next: WizardState = { ...wizard, step: "finish", inviteSkipped: true }
      setWizard(next)
      await persistStep("invite", { inviteSkipped: true })
      setWizard((current) => ({ ...current, step: "finish" }))
    })
  }

  const handleFinish = () => {
    if (!wizard.orgSlug || !wizard.classId) return
    startTransition(async () => {
      await persistStep("finish", {}, { markCompleted: true })
      router.push(`/${wizard.orgSlug}/classes/${wizard.classId}?tab=people&setup=1`)
    })
  }

  const headerActions = (
    <SetupStepper
      steps={WIZARD_STEPS}
      currentStepId={wizard.step}
      completedStepIds={completedSteps}
      className="min-w-0 flex-1 max-w-xl"
    />
  )

  return (
    <OrgOnboardingShell width="wide" headerActions={headerActions} wizardMode>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        <div className="min-w-0 space-y-6">
          {wizard.step === "workspace" ? (
            <OrgCreateForm
              pending={pending}
              error={error}
              onBack={() => router.push("/org")}
              onSubmit={handleCreateOrg}
            />
          ) : null}

          {wizard.step === "class" ? (
            <form onSubmit={handleCreateClass} noValidate>
              <Panel padding="none" className="animate-rise overflow-hidden">
                <PanelHeader>
                  <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
                    <IconBadge tone="primary" size="md">
                      <BookOpen />
                    </IconBadge>
                    <div className="min-w-0 space-y-0.5">
                      <PanelTitle>Create your first class</PanelTitle>
                      <PanelDescription>
                        You can add schedule, color, and resources later.
                      </PanelDescription>
                    </div>
                  </PanelHeading>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setWizard((current) => ({ ...current, step: "workspace" }))}
                  >
                    <ArrowLeft aria-hidden="true" />
                    Back
                  </Button>
                </PanelHeader>
                <PanelBody className="space-y-6 p-5 sm:p-6">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="class-title">Class name</FieldLabel>
                      <Input
                        id="class-title"
                        value={classTitle}
                        autoFocus
                        required
                        disabled={pending}
                        placeholder="Algebra I"
                        onChange={(event) => setClassTitle(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="class-category">Subject or grade</FieldLabel>
                      <Input
                        id="class-category"
                        value={classCategory}
                        disabled={pending}
                        placeholder="Mathematics · Grade 9"
                        onChange={(event) => setClassCategory(event.target.value)}
                      />
                      <FieldHelp id="class-category-help">
                        Stored as the class category. You can refine it later.
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
                  <Button type="submit" isLoading={pending} disabled={!classTitle.trim() || pending}>
                    Continue
                    {!pending ? <ArrowRight aria-hidden="true" /> : null}
                  </Button>
                </PanelFooter>
              </Panel>
            </form>
          ) : null}

          {wizard.step === "invite" && wizard.enrollmentCode ? (
            <Panel padding="none" className="animate-rise overflow-hidden">
              <PanelHeader>
                <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
                  <IconBadge tone="info" size="md">
                    <Share2 />
                  </IconBadge>
                  <div className="min-w-0 space-y-0.5">
                    <PanelTitle>Invite learners</PanelTitle>
                    <PanelDescription>
                      Share a reusable link or code so students can join in one step.
                    </PanelDescription>
                  </div>
                </PanelHeading>
              </PanelHeader>
              <PanelBody className="space-y-5 p-5 sm:p-6">
                <div className="panel-sunken space-y-3 p-4">
                  <Text variant="caption" tone="muted">
                    Enrollment link
                  </Text>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="type-mono min-w-0 flex-1 truncate text-sm">{enrollmentLink}</code>
                    <CopyButton value={enrollmentLink} label="Copy enrollment link" showLabel />
                  </div>
                </div>
                <div className="panel-sunken space-y-3 p-4">
                  <Text variant="caption" tone="muted">
                    Class code
                  </Text>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="type-mono text-lg font-semibold">{wizard.enrollmentCode}</code>
                    <CopyButton value={wizard.enrollmentCode} label="Copy class code" showLabel />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleRegenerateCode}>
                    <RefreshCw aria-hidden="true" />
                    Regenerate code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleToggleCode(!(wizard.codeEnabled ?? true))}
                  >
                    <KeyRound aria-hidden="true" />
                    {wizard.codeEnabled === false ? "Enable code" : "Disable code"}
                  </Button>
                </div>
                {error ? (
                  <Callout tone="danger" role="alert">
                    {error}
                  </Callout>
                ) : null}
              </PanelBody>
              <PanelFooter className="justify-between gap-3">
                <Button type="button" variant="ghost" disabled={pending} onClick={handleSkipInvite}>
                  Skip for now
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    trackOnboardingEvent("invite_shared", { organizationId: wizard.orgId })
                    void persistStep("invite", {})
                    setWizard((current) => ({ ...current, step: "finish" }))
                  }}
                >
                  Continue
                  <ArrowRight aria-hidden="true" />
                </Button>
              </PanelFooter>
            </Panel>
          ) : null}

          {wizard.step === "finish" ? (
            <Panel padding="none" className="animate-rise overflow-hidden">
              <PanelHeader>
                <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
                  <IconBadge tone="success" size="md">
                    <Building2 />
                  </IconBadge>
                  <div className="min-w-0 space-y-0.5">
                    <PanelTitle>Your workspace is ready</PanelTitle>
                    <PanelDescription>
                      Open the People tab to watch your roster grow and finish class setup.
                    </PanelDescription>
                  </div>
                </PanelHeading>
              </PanelHeader>
              <PanelBody className="space-y-4 p-5 sm:p-6">
                <Text variant="body" tone="muted">
                  {wizard.orgName} · {wizard.classTitle}
                  {wizard.inviteSkipped ? " · Invite pending" : " · Invite ready to share"}
                </Text>
              </PanelBody>
              <PanelFooter className="justify-end">
                <Button type="button" isLoading={pending} onClick={handleFinish}>
                  Open People tab
                  <ArrowRight aria-hidden="true" />
                </Button>
              </PanelFooter>
            </Panel>
          ) : null}
        </div>

        <SetupSummaryRail items={summaryItems} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-end gap-3">
          {wizard.step === "invite" ? (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={handleSkipInvite}>
              Skip
            </Button>
          ) : null}
        </div>
      </div>
    </OrgOnboardingShell>
  )
}

export { slugify }
