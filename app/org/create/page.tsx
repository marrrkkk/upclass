import { Suspense } from "react"
import { redirect } from "next/navigation"

import { TeacherSetupWizard } from "@/components/onboard/wizard/teacher-setup-wizard"
import { OrgOnboardingSkeleton } from "@/components/onboard/org-onboarding-skeleton"
import { needsAccountSetup } from "@/app/actions/onboarding"
import { getOnboardingContext } from "@/lib/server/organizations"

export const metadata = { title: "Create organization" }

async function ResolvedCreateOrgPage() {
  const context = await getOnboardingContext()
  if (!context) redirect("/sign-in")

  if (await needsAccountSetup()) {
    redirect("/org/setup?scope=account&from=/org/create")
  }

  return <TeacherSetupWizard />
}

export default function CreateOrgPage() {
  return (
    <Suspense fallback={<OrgOnboardingSkeleton />}>
      <ResolvedCreateOrgPage />
    </Suspense>
  )
}
