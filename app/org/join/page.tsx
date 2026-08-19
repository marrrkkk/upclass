import { Suspense } from "react"
import { redirect } from "next/navigation"

import { OrgJoinClient } from "@/components/onboard/org-join-client"
import { OrgOnboardingSkeleton } from "@/components/onboard/org-onboarding-skeleton"
import { needsAccountSetup } from "@/app/actions/onboarding"
import { getOnboardingContext } from "@/lib/server/organizations"

export const metadata = { title: "Join organization" }

type JoinOrgPageProps = {
  searchParams?: Promise<{ token?: string; code?: string; error?: string; from?: string }>
}

async function ResolvedJoinOrgPage({ searchParams }: JoinOrgPageProps) {
  const context = await getOnboardingContext()
  if (!context) {
    const params = searchParams ? await searchParams : {}
    const from = params.code
      ? `/org/join?code=${encodeURIComponent(params.code)}`
      : params.token
        ? `/org/join?token=${encodeURIComponent(params.token)}`
        : "/org/join"
    redirect(`/sign-in?from=${encodeURIComponent(from)}`)
  }

  if (await needsAccountSetup()) {
    const params = searchParams ? await searchParams : {}
    const from =
      params.code
        ? `/org/join?code=${encodeURIComponent(params.code)}`
        : params.token
          ? `/org/join?token=${encodeURIComponent(params.token)}`
          : "/org/join"
    redirect(`/org/setup?scope=account&from=${encodeURIComponent(from)}`)
  }

  const params = searchParams ? await searchParams : {}

  return (
    <OrgJoinClient
      viewer={context.viewer}
      initialToken={params.token}
      initialClassCode={params.code?.toUpperCase()}
      error={params.error}
    />
  )
}

export default function JoinOrgPage(props: JoinOrgPageProps) {
  return (
    <Suspense fallback={<OrgOnboardingSkeleton />}>
      <ResolvedJoinOrgPage searchParams={props.searchParams} />
    </Suspense>
  )
}
