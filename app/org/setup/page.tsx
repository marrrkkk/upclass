import { Suspense } from "react"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { AccountSetupForm } from "@/components/onboard/account-setup-form"
import { TeacherSetupWizard } from "@/components/onboard/wizard/teacher-setup-wizard"
import { OrgOnboardingShell } from "@/components/onboard/org-onboarding-shell"
import { OrgOnboardingSkeleton } from "@/components/onboard/org-onboarding-skeleton"
import { getOnboardingState, needsAccountSetup } from "@/app/actions/onboarding"
import { db } from "@/db"
import { organizations } from "@/db/schema"
import { getOnboardingContext } from "@/lib/server/organizations"
import { orgSetupScopeKey } from "@/lib/onboarding/constants"

export const metadata = { title: "Setup" }

type SetupPageProps = {
  searchParams?: Promise<{
    scope?: string
    org?: string
    from?: string
  }>
}

async function ResolvedSetupPage({ searchParams }: SetupPageProps) {
  const context = await getOnboardingContext()
  if (!context) redirect("/sign-in")

  const params = searchParams ? await searchParams : {}
  const returnTo = params.from

  if (params.scope === "account" || (await needsAccountSetup())) {
    if (params.scope !== "account" && params.org) {
      // Resume org setup only after account is ready when explicitly resuming.
    } else if (await needsAccountSetup()) {
      return (
        <OrgOnboardingShell width="content">
          <AccountSetupForm
            initialName={context.viewer.name}
            returnTo={
              returnTo ??
              (params.org
                ? `/org/setup?org=${encodeURIComponent(params.org)}`
                : undefined)
            }
          />
        </OrgOnboardingShell>
      )
    }
  }

  if (params.scope === "account") {
    return (
      <OrgOnboardingShell width="content">
        <AccountSetupForm initialName={context.viewer.name} returnTo={returnTo} />
      </OrgOnboardingShell>
    )
  }

  const orgSlug = params.org
  if (!orgSlug) redirect("/org")

  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      description: organizations.description,
    })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1)

  if (!organization) redirect("/org")

  const onboardingState = await getOnboardingState(orgSetupScopeKey(organization.id))
  if (onboardingState?.completedAt) {
    redirect(`/${organization.slug}/dashboard`)
  }

  return (
    <TeacherSetupWizard
      resumeOrg={organization}
      initialState={onboardingState}
    />
  )
}

export default function SetupPage(props: SetupPageProps) {
  return (
    <Suspense fallback={<OrgOnboardingSkeleton />}>
      <ResolvedSetupPage searchParams={props.searchParams} />
    </Suspense>
  )
}
