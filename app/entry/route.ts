import { NextResponse, type NextRequest } from "next/server"

import { auth } from "@/lib/auth"
import { LAST_ORG_COOKIE } from "@/lib/organization-path"
import { needsAccountSetup } from "@/app/actions/onboarding"
import { listUserOrganizations } from "@/app/actions/organization"

/**
 * Post-authentication entry resolver.
 *
 * Sends the user straight into their workspace instead of the workspace list:
 * one organization opens directly, multiple organizations open the most
 * recently opened one (tracked by the proxy's `upclass-last-org` cookie), and
 * only when nothing points anywhere does the user land on `/org`.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  if (await needsAccountSetup()) {
    return NextResponse.redirect(new URL("/org/setup?scope=account", request.url))
  }

  const orgsResult = await listUserOrganizations()
  const organizations = orgsResult.success ? (orgsResult.data ?? []) : []

  if (organizations.length === 0) {
    return NextResponse.redirect(new URL("/org", request.url))
  }

  if (organizations.length === 1) {
    return NextResponse.redirect(new URL(`/${organizations[0].slug}/dashboard`, request.url))
  }

  const lastOrgSlug = request.cookies.get(LAST_ORG_COOKIE)?.value
  const lastOrg = organizations.find((org) => org.slug === lastOrgSlug)
  if (lastOrg) {
    return NextResponse.redirect(new URL(`/${lastOrg.slug}/dashboard`, request.url))
  }

  return NextResponse.redirect(new URL("/org", request.url))
}
