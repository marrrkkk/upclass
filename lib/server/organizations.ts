import { cache } from "react"
import { eq } from "drizzle-orm"

import { listUserOrganizations } from "@/app/actions/organization"
import { db } from "@/db"
import { user } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import type { OrganizationSummary } from "@/types/organization"

export type OnboardingContext = {
  viewer: { id: string; name: string | null; email: string | null }
  organizations: OrganizationSummary[]
}

/**
 * Data every `/org` route needs: who is signed in and which workspaces they can
 * already open. Cached per request so the three onboarding routes can share one
 * implementation without re-querying.
 *
 * Returns `null` when there is no session; callers redirect to sign-in.
 */
export const getOnboardingContext = cache(async (): Promise<OnboardingContext | null> => {
  const session = await getOptionalSession()
  if (!session?.user?.id) return null

  const [userRows, organizationsResult] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1),
    listUserOrganizations(),
  ])

  const viewer = userRows[0] ?? {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
  }

  return {
    viewer,
    organizations: organizationsResult.success ? (organizationsResult.data ?? []) : [],
  }
})
