import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { eq, and, desc } from "drizzle-orm"

import { db } from "@/db"
import { organization, orgMembership, orgResource } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { OrgResourceLibrary } from "@/components/organizations/org-resource-library"

export const metadata: Metadata = {
  title: "Organization Library",
}

export default async function OrgLibraryPage({
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

  // Verify user membership and get role
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

  if (myMembership.length === 0) {
    redirect("/")
  }

  // Fetch org resources
  const resources = await db
    .select()
    .from(orgResource)
    .where(eq(orgResource.organizationId, org.id))
    .orderBy(desc(orgResource.createdAt))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-muted-foreground">
          Shared resources for {org.name}
        </p>
      </div>

      <OrgResourceLibrary
        orgId={org.id}
        resources={resources}
        userRole={myMembership[0].role as "admin" | "teacher" | "student"}
      />
    </div>
  )
}
