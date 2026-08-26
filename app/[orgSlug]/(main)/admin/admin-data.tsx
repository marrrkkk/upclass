import { notFound, redirect } from "next/navigation"
import { asc, eq } from "drizzle-orm"

import { OrganizationAdminClient } from "@/components/organization/organization-admin-client"
import { db } from "@/db"
import { classes, organizations, orgMembership, user } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { getRequestOrigin } from "@/lib/server/request"
import { getOrganizationMembership } from "@/lib/org-validation"
import { canManageOrganization } from "@/lib/org-permissions"
import { listOrganizationInvitations } from "@/app/actions/organization"
import type { OrgRole } from "@/types/organization"

export async function AdminData({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getOptionalSession()
  if (!session?.user?.id) redirect("/sign-in")

  const { orgSlug } = await params
  const membership = await getOrganizationMembership(session.user.id, orgSlug)
  if (!membership) notFound()
  if (!canManageOrganization(membership.role)) redirect(`/${orgSlug}/dashboard`)

  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      description: organizations.description,
      logo: organizations.logo,
      cover: organizations.cover,
    })
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .limit(1)
  if (!organization) notFound()

  const [members, organizationClasses, invitationsResult, requestOrigin] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: orgMembership.role,
        joinedAt: orgMembership.createdAt,
      })
      .from(orgMembership)
      .innerJoin(user, eq(orgMembership.userId, user.id))
      .where(eq(orgMembership.orgId, organization.id))
      .orderBy(asc(user.name)),
    db
      .select({
        id: classes.id,
        title: classes.title,
        code: classes.code,
        color: classes.color,
        ownerName: user.name,
      })
      .from(classes)
      .innerJoin(user, eq(classes.ownerId, user.id))
      .where(eq(classes.orgId, organization.id))
      .orderBy(asc(classes.title)),
    listOrganizationInvitations({ orgId: organization.id }),
    getRequestOrigin(),
  ])

  return (
    <OrganizationAdminClient
      organization={{ ...organization, slug: orgSlug }}
      currentRole={membership.role as Extract<OrgRole, "owner" | "admin">}
      currentUserId={session.user.id}
      members={members}
      classes={organizationClasses}
      invitations={invitationsResult.success ? (invitationsResult.data ?? []) : []}
      inviteOrigin={requestOrigin}
    />
  )
}