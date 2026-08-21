"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { and, asc, count, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { organizations, orgMembership, orgInvitations, user } from "@/db/schema"
import {
  createInvitationSchema,
  createOrganizationSchema,
  joinOrganizationSchema,
  removeMemberSchema,
  revokeInvitationSchema,
  updateMemberRoleSchema,
} from "@/lib/validation/actions"
import type { OrgRole } from "@/types/organization"
import { canManageOrganization } from "@/lib/org-permissions"

type ActionResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

/** First validation message from a Zod issue list, or a safe fallback. */
function firstIssue(error: { issues: Array<{ message: string }> }, fallback: string) {
  return error.issues[0]?.message ?? fallback
}

async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

/** Membership of the acting user, used for every role gate below. */
async function getActorMembership(orgId: string, userId: string) {
  const [membership] = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(and(eq(orgMembership.orgId, orgId), eq(orgMembership.userId, userId)))
    .limit(1)

  return membership ?? null
}

/**
 * Refresh every surface that renders organization membership. Without this the
 * admin console would keep serving a cached list and mutations would look like
 * they had failed until the user reloaded.
 */
async function revalidateOrganization(orgId: string) {
  const [organization] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  revalidatePath("/org")
  if (organization?.slug) {
    revalidatePath(`/${organization.slug}/admin`)
    revalidatePath(`/${organization.slug}/dashboard`)
  }
}

export async function createOrganization(data: {
  name: string
  slug: string
  description?: string
}): Promise<ActionResponse<{ orgId: string; slug: string }>> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  const parsed = createOrganizationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invalid organization details") }
  }

  const { name, slug, description } = parsed.data

  try {
    const existingOrg = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1)

    if (existingOrg.length > 0) {
      return { success: false, error: "This organization URL is already taken" }
    }

    const orgId = crypto.randomUUID()

    await db.insert(organizations).values({
      id: orgId,
      name,
      slug,
      description: description ?? null,
      createdBy: userId,
      settings: {},
    })

    await db.insert(orgMembership).values({
      id: crypto.randomUUID(),
      orgId,
      userId,
      role: "owner",
    })

    revalidatePath("/org")
    revalidatePath(`/${slug}/dashboard`)

    return { success: true, data: { orgId, slug } }
  } catch (error) {
    console.error("createOrganization error", error)
    return { success: false, error: "Failed to create organization" }
  }
}

export async function joinOrganizationByInvite(data: {
  token: string
}): Promise<ActionResponse<{ orgId: string; orgSlug: string }>> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const parsed = joinOrganizationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invite code is required") }
  }

  const { token } = parsed.data

  try {
    const [inviteWithOrg] = await db
      .select({
        invitation: orgInvitations,
        orgSlug: organizations.slug,
      })
      .from(orgInvitations)
      .innerJoin(organizations, eq(orgInvitations.orgId, organizations.id))
      .where(eq(orgInvitations.token, token))
      .limit(1)

    if (!inviteWithOrg) {
      return { success: false, error: "Invalid or expired invite code" }
    }

    const invitation = inviteWithOrg.invitation

    if (new Date() > invitation.expiresAt) {
      return { success: false, error: "This invite code has expired" }
    }

    if (session.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return {
        success: false,
        error: "This invite was sent to a different email address",
      }
    }

    const existingMembership = await db
      .select({ id: orgMembership.id })
      .from(orgMembership)
      .where(
        and(
          eq(orgMembership.orgId, invitation.orgId),
          eq(orgMembership.userId, session.user.id),
        ),
      )
      .limit(1)

    if (existingMembership.length > 0) {
      return { success: false, error: "You are already a member of this organization" }
    }

    await db.insert(orgMembership).values({
      id: crypto.randomUUID(),
      orgId: invitation.orgId,
      userId: session.user.id,
      role: invitation.role,
    })

    await db.delete(orgInvitations).where(eq(orgInvitations.id, invitation.id))

    await revalidateOrganization(invitation.orgId)

    return { success: true, data: { orgId: invitation.orgId, orgSlug: inviteWithOrg.orgSlug } }
  } catch (error) {
    console.error("joinOrganizationByInvite error", error)
    return { success: false, error: "Failed to join organization" }
  }
}

export async function listUserOrganizations(): Promise<
  ActionResponse<
    Array<{
      id: string
      name: string
      slug: string
      description: string | null
      logo: string | null
      role: OrgRole
      memberCount: number
    }>
  >
> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const userOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        description: organizations.description,
        logo: organizations.logo,
        role: orgMembership.role,
      })
      .from(orgMembership)
      .innerJoin(organizations, eq(orgMembership.orgId, organizations.id))
      .where(eq(orgMembership.userId, userId))
      .orderBy(asc(organizations.name))

    if (userOrgs.length === 0) {
      return { success: true, data: [] }
    }

    // One grouped aggregate rather than a query per organization.
    const memberCounts = await db
      .select({ orgId: orgMembership.orgId, total: count() })
      .from(orgMembership)
      .where(
        inArray(
          orgMembership.orgId,
          userOrgs.map((org) => org.id),
        ),
      )
      .groupBy(orgMembership.orgId)

    const countByOrgId = new Map(memberCounts.map((row) => [row.orgId, Number(row.total)]))

    return {
      success: true,
      data: userOrgs.map((org) => ({ ...org, memberCount: countByOrgId.get(org.id) ?? 1 })),
    }
  } catch (error) {
    console.error("listUserOrganizations error", error)
    return { success: false, error: "Failed to fetch organizations" }
  }
}

export async function createInvitation(data: {
  orgId: string
  email: string
  role?: "admin" | "teacher" | "student"
}): Promise<ActionResponse<{ token: string; expiresAt: Date }>> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  const parsed = createInvitationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invalid invitation details") }
  }

  const { orgId, email, role } = parsed.data

  try {
    const membership = await getActorMembership(orgId, userId)

    if (!membership || !canManageOrganization(membership.role as OrgRole)) {
      return { success: false, error: "You don't have permission to invite members" }
    }

    if (membership.role === "admin" && role === "admin") {
      return { success: false, error: "Only the organization owner can invite administrators" }
    }

    // Someone already inside the organization does not need an invite.
    const [existingMember] = await db
      .select({ id: orgMembership.id })
      .from(orgMembership)
      .innerJoin(user, eq(orgMembership.userId, user.id))
      .where(and(eq(orgMembership.orgId, orgId), eq(user.email, email)))
      .limit(1)

    if (existingMember) {
      return { success: false, error: "That person is already a member of this organization" }
    }

    const existingInvite = await db
      .select({ id: orgInvitations.id })
      .from(orgInvitations)
      .where(and(eq(orgInvitations.orgId, orgId), eq(orgInvitations.email, email)))
      .limit(1)

    if (existingInvite.length > 0) {
      return { success: false, error: "An invitation has already been sent to this email" }
    }

    const token = crypto.randomUUID().replace(/-/g, "")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await db.insert(orgInvitations).values({
      id: crypto.randomUUID(),
      orgId,
      email,
      role,
      token,
      invitedBy: userId,
      expiresAt,
    })

    await revalidateOrganization(orgId)

    return { success: true, data: { token, expiresAt } }
  } catch (error) {
    console.error("createInvitation error", error)
    return { success: false, error: "Failed to create invitation" }
  }
}

/** Pending invitations for an organization. Owners and admins only. */
export async function listOrganizationInvitations(data: { orgId: string }): Promise<
  ActionResponse<
    Array<{
      id: string
      email: string
      role: OrgRole
      token: string
      expiresAt: Date
      createdAt: Date
      invitedByName: string | null
    }>
  >
> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const membership = await getActorMembership(data.orgId, userId)
    if (!membership || !canManageOrganization(membership.role as OrgRole)) {
      return { success: false, error: "You don't have permission to view invitations" }
    }

    const invitations = await db
      .select({
        id: orgInvitations.id,
        email: orgInvitations.email,
        role: orgInvitations.role,
        token: orgInvitations.token,
        expiresAt: orgInvitations.expiresAt,
        createdAt: orgInvitations.createdAt,
        invitedByName: user.name,
      })
      .from(orgInvitations)
      .leftJoin(user, eq(orgInvitations.invitedBy, user.id))
      .where(eq(orgInvitations.orgId, data.orgId))
      .orderBy(asc(orgInvitations.createdAt))

    return { success: true, data: invitations }
  } catch (error) {
    console.error("listOrganizationInvitations error", error)
    return { success: false, error: "Failed to fetch invitations" }
  }
}

/** Withdraw a pending invitation so its code stops working. */
export async function revokeInvitation(data: {
  orgId: string
  invitationId: string
}): Promise<ActionResponse> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  const parsed = revokeInvitationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invalid invitation") }
  }

  const { orgId, invitationId } = parsed.data

  try {
    const membership = await getActorMembership(orgId, userId)
    if (!membership || !canManageOrganization(membership.role as OrgRole)) {
      return { success: false, error: "You don't have permission to revoke invitations" }
    }

    const [invitation] = await db
      .select({ role: orgInvitations.role })
      .from(orgInvitations)
      .where(and(eq(orgInvitations.id, invitationId), eq(orgInvitations.orgId, orgId)))
      .limit(1)

    if (!invitation) {
      return { success: false, error: "That invitation no longer exists" }
    }

    if (membership.role === "admin" && invitation.role === "admin") {
      return { success: false, error: "Only the organization owner can revoke administrator invites" }
    }

    await db
      .delete(orgInvitations)
      .where(and(eq(orgInvitations.id, invitationId), eq(orgInvitations.orgId, orgId)))

    await revalidateOrganization(orgId)

    return { success: true }
  } catch (error) {
    console.error("revokeInvitation error", error)
    return { success: false, error: "Failed to revoke invitation" }
  }
}

export async function updateMemberRole(data: {
  orgId: string
  userId: string
  role: "admin" | "teacher" | "student"
}): Promise<ActionResponse> {
  const actorId = await requireUserId()
  if (!actorId) return { success: false, error: "Unauthorized" }

  const parsed = updateMemberRoleSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invalid role change") }
  }

  const { orgId, userId, role } = parsed.data

  try {
    const membership = await getActorMembership(orgId, actorId)

    if (!membership || membership.role !== "owner") {
      return { success: false, error: "Only organization owners can change member roles" }
    }

    if (userId === actorId) {
      return { success: false, error: "You cannot change your own role" }
    }

    const [target] = await db
      .select({ role: orgMembership.role })
      .from(orgMembership)
      .where(and(eq(orgMembership.orgId, orgId), eq(orgMembership.userId, userId)))
      .limit(1)

    if (!target) {
      return { success: false, error: "That person is no longer a member of this organization" }
    }

    if (target.role === "owner") {
      return { success: false, error: "The organization owner's role cannot be changed" }
    }

    await db
      .update(orgMembership)
      .set({ role })
      .where(and(eq(orgMembership.orgId, orgId), eq(orgMembership.userId, userId)))

    await revalidateOrganization(orgId)

    return { success: true }
  } catch (error) {
    console.error("updateMemberRole error", error)
    return { success: false, error: "Failed to update member role" }
  }
}

export async function removeMember(data: {
  orgId: string
  userId: string
}): Promise<ActionResponse> {
  const actorId = await requireUserId()
  if (!actorId) return { success: false, error: "Unauthorized" }

  const parsed = removeMemberSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error, "Invalid member") }
  }

  const { orgId, userId } = parsed.data

  try {
    const membership = await getActorMembership(orgId, actorId)

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return { success: false, error: "You don't have permission to remove members" }
    }

    const [target] = await db
      .select({ role: orgMembership.role })
      .from(orgMembership)
      .where(and(eq(orgMembership.orgId, orgId), eq(orgMembership.userId, userId)))
      .limit(1)

    if (!target) {
      return { success: false, error: "That person is no longer a member of this organization" }
    }

    if (target.role === "owner") {
      return { success: false, error: "Cannot remove the organization owner" }
    }

    // Admins manage members; only the owner can remove another admin.
    if (membership.role === "admin" && target.role === "admin") {
      return { success: false, error: "Only the organization owner can remove administrators" }
    }

    await db
      .delete(orgMembership)
      .where(and(eq(orgMembership.orgId, orgId), eq(orgMembership.userId, userId)))

    await revalidateOrganization(orgId)

    return { success: true }
  } catch (error) {
    console.error("removeMember error", error)
    return { success: false, error: "Failed to remove member" }
  }
}
