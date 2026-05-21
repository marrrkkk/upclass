"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and, count } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import {
  orgMembership,
  classMembership,
  classes,
  user,
} from "@/db/schema"
import { orgRoleSchema, type OrgRole } from "@/lib/validation/organizations"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Get the current authenticated user's session or return null.
 */
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

/**
 * Check if the current user has admin role in the specified organization.
 */
async function isOrgAdmin(orgId: string, userId: string): Promise<boolean> {
  const membership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, userId),
      ),
    )
    .limit(1)

  return membership.length > 0 && membership[0].role === "admin"
}

/**
 * List all members of an organization with their user info and roles.
 */
export async function listMembers(
  orgId: string,
): Promise<ActionResult<Array<{
  id: string
  userId: string
  name: string
  email: string
  image: string | null
  role: OrgRole
  createdAt: Date
}>>> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify the requester is a member of this org
  const requesterMembership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (requesterMembership.length === 0) {
    return { success: false, error: "Not a member of this organization" }
  }

  const members = await db
    .select({
      id: orgMembership.id,
      userId: orgMembership.userId,
      name: user.name,
      email: user.email,
      image: user.image,
      role: orgMembership.role,
      createdAt: orgMembership.createdAt,
    })
    .from(orgMembership)
    .innerJoin(user, eq(orgMembership.userId, user.id))
    .where(eq(orgMembership.organizationId, orgId))

  return { success: true, data: members }
}

/**
 * Change a member's role within an organization.
 * Admin-only. Rejects same-role changes and protects last admin.
 */
export async function changeRole(
  orgId: string,
  userId: string,
  newRole: string,
): Promise<ActionResult<{ userId: string; newRole: OrgRole }>> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Only admins can change roles
  if (!(await isOrgAdmin(orgId, session.user.id))) {
    return { success: false, error: "Insufficient permissions" }
  }

  // Validate role value
  const roleResult = orgRoleSchema.safeParse(newRole)
  if (!roleResult.success) {
    return { success: false, error: "Invalid role. Must be one of: admin, teacher, student" }
  }
  const validatedRole = roleResult.data

  // Get target member's current role
  const targetMembership = await db
    .select({ id: orgMembership.id, role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, userId),
      ),
    )
    .limit(1)

  if (targetMembership.length === 0) {
    return { success: false, error: "Member not found in this organization" }
  }

  // Reject same-role change
  if (targetMembership[0].role === validatedRole) {
    return { success: false, error: "Member already has the specified role" }
  }

  // Protect last admin
  if (targetMembership[0].role === "admin" && validatedRole !== "admin") {
    const adminCount = await db
      .select({ count: count() })
      .from(orgMembership)
      .where(
        and(
          eq(orgMembership.organizationId, orgId),
          eq(orgMembership.role, "admin"),
        ),
      )

    if (adminCount[0].count <= 1) {
      return { success: false, error: "Cannot change role: at least one admin is required" }
    }
  }

  // Update role
  await db
    .update(orgMembership)
    .set({ role: validatedRole })
    .where(eq(orgMembership.id, targetMembership[0].id))

  revalidatePath(`/`)

  return { success: true, data: { userId, newRole: validatedRole } }
}

/**
 * Remove a member from an organization.
 * Admin-only. Cascades class memberships for org classes. Rejects last-admin removal.
 */
export async function removeMember(
  orgId: string,
  userId: string,
): Promise<ActionResult<{ userId: string }>> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Only admins can remove members
  if (!(await isOrgAdmin(orgId, session.user.id))) {
    return { success: false, error: "Insufficient permissions" }
  }

  // Get target member
  const targetMembership = await db
    .select({ id: orgMembership.id, role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, userId),
      ),
    )
    .limit(1)

  if (targetMembership.length === 0) {
    return { success: false, error: "Member not found in this organization" }
  }

  // Protect last admin
  if (targetMembership[0].role === "admin") {
    const adminCount = await db
      .select({ count: count() })
      .from(orgMembership)
      .where(
        and(
          eq(orgMembership.organizationId, orgId),
          eq(orgMembership.role, "admin"),
        ),
      )

    if (adminCount[0].count <= 1) {
      return { success: false, error: "Cannot remove the last admin from the organization" }
    }
  }

  // Transaction: remove class memberships for org classes, then remove org membership
  await db.transaction(async (tx) => {
    // Find all classes belonging to this organization
    const orgClasses = await tx
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.organizationId, orgId))

    // Delete class memberships for the user in all org classes
    if (orgClasses.length > 0) {
      for (const orgClass of orgClasses) {
        await tx
          .delete(classMembership)
          .where(
            and(
              eq(classMembership.classId, orgClass.id),
              eq(classMembership.userId, userId),
            ),
          )
      }
    }

    // Delete the org membership
    await tx
      .delete(orgMembership)
      .where(eq(orgMembership.id, targetMembership[0].id))
  })

  revalidatePath(`/`)

  return { success: true, data: { userId } }
}

/**
 * Get the current user's role in a specified organization.
 */
export async function getCurrentUserOrgRole(
  orgId: string,
): Promise<ActionResult<{ role: OrgRole } | null>> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const membership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: true, data: null }
  }

  return { success: true, data: { role: membership[0].role as OrgRole } }
}
