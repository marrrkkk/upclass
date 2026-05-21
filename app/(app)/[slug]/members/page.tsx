import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { organization, orgMembership, user } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { MemberTable, type MemberInfo } from "@/components/organizations/member-table"
import { InviteTrigger } from "./invite-trigger"

export const metadata: Metadata = {
  title: "Organization Members",
}

export default async function OrgMembersPage({
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

  const currentUserRole = myMembership[0].role

  // Fetch all members with user info
  const members = await db
    .select({
      id: orgMembership.id,
      userId: orgMembership.userId,
      role: orgMembership.role,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(orgMembership)
    .innerJoin(user, eq(orgMembership.userId, user.id))
    .where(eq(orgMembership.organizationId, org.id))

  const memberData: MemberInfo[] = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.name,
    email: m.email,
    image: m.image,
    role: m.role as MemberInfo["role"],
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">
            Manage members of {org.name}
          </p>
        </div>
        {currentUserRole === "admin" && <InviteTrigger orgId={org.id} />}
      </div>

      <MemberTable
        members={memberData}
        currentUserRole={currentUserRole as MemberInfo["role"]}
        orgId={org.id}
      />
    </div>
  )
}
