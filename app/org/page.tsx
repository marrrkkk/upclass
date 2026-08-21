import { Suspense } from "react"
import { redirect } from "next/navigation"

import { OrgSelectionClient, type OrgOnboardingMode } from "@/components/onboard/org-selection-client"
import { OrgOnboardingSkeleton } from "@/components/onboard/org-onboarding-skeleton"
import { needsAccountSetup } from "@/app/actions/onboarding"
import { getOnboardingContext } from "@/lib/server/organizations"

export const metadata = { title: "Workspaces" }

type OrgPageProps = {
  searchParams?: Promise<{
    mode?: OrgOnboardingMode
    error?: string
    token?: string
  }>
}

async function ResolvedOrgPage({ searchParams }: OrgPageProps) {
  const context = await getOnboardingContext()
  if (!context) redirect("/sign-in")

  if (await needsAccountSetup()) {
    redirect("/org/setup?scope=account")
  }

  const params = searchParams ? await searchParams : {}
  const mode: OrgOnboardingMode =
    params.mode === "create" || params.mode === "join" ? params.mode : params.token ? "join" : "select"

  return (
    <OrgSelectionClient
      initialData={context.viewer}
      userOrganizations={context.organizations}
      initialMode={mode}
      initialInviteCode={params.token}
      error={params.error}
    />
  )
}

export default function OrgPage(props: OrgPageProps) {
  return (
    <Suspense fallback={<OrgOnboardingSkeleton />}>
      <ResolvedOrgPage searchParams={props.searchParams} />
    </Suspense>
  )
}
