import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { organization, orgMembership } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { OrgSettingsForm } from "@/components/organizations/org-settings-form"

export const metadata: Metadata = {
  title: "Organization Settings",
}

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  // Fetch org by slug
  const orgs = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1)

  if (orgs.length === 0) {
    redirect("/")
  }

  const org = orgs[0]

  // Verify user is admin
  const myMembership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, org.id),
        eq(orgMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (myMembership.length === 0 || myMembership[0].role !== "admin") {
    redirect(`/${slug}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage settings for {org.name}
        </p>
      </div>

      <OrgSettingsForm
        orgId={org.id}
        initialName={org.name}
        initialDescription={org.description}
        initialLogo={org.logo}
      />
    </div>
  )
}
