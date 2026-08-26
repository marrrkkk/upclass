/**
 * Organization validation utilities for proxy and server components
 */

import { db } from "@/db"
import { organizations, orgMembership } from "@/db/schema"
import { cache } from "react"
import { eq, and } from "drizzle-orm"

/**
 * Check if an organization exists by slug
 */
export async function orgExists(slug: string): Promise<boolean> {
  try {
    const org = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1)

    return org.length > 0
  } catch (error) {
    console.error("[org-validation] Error checking if org exists:", error)
    return false
  }
}

/**
 * Check if a user is a member of an organization
 */
export async function isOrgMember(
  userId: string,
  orgSlug: string
): Promise<boolean> {
  try {
    const membership = await db
      .select({ id: orgMembership.id })
      .from(orgMembership)
      .innerJoin(organizations, eq(organizations.id, orgMembership.orgId))
      .where(
        and(
          eq(orgMembership.userId, userId),
          eq(organizations.slug, orgSlug)
        )
      )
      .limit(1)

    return membership.length > 0
  } catch (error) {
    console.error("[org-validation] Error checking org membership:", error)
    return false
  }
}

/**
 * Get organization ID by slug
 */
export async function getOrgIdBySlug(
  slug: string
): Promise<string | null> {
  try {
    const org = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1)

    return org[0]?.id || null
  } catch (error) {
    console.error("[org-validation] Error getting org ID:", error)
    return null
  }
}

export type OrganizationMembership = {
  orgId: string
  role: "owner" | "admin" | "member" | "teacher" | "student"
}

/** Get a user's membership for the organization represented by a URL slug. */
export const getOrganizationMembership = cache(
  async (
    userId: string,
    slug: string,
  ): Promise<OrganizationMembership | null> => {
    const [membership] = await db
      .select({ orgId: orgMembership.orgId, role: orgMembership.role })
      .from(orgMembership)
      .innerJoin(organizations, eq(organizations.id, orgMembership.orgId))
      .where(and(eq(orgMembership.userId, userId), eq(organizations.slug, slug)))
      .limit(1)

    return membership ?? null
  },
)

/**
 * Validate org access for a user
 * Returns true if org exists and user is a member
 */
export async function validateOrgAccess(
  userId: string,
  orgSlug: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // One roundtrip resolves both the "org exists" and "user is a member"
    // answers; this check runs in the proxy on every request.
    const [row] = await db
      .select({ membershipId: orgMembership.id })
      .from(organizations)
      .leftJoin(
        orgMembership,
        and(
          eq(orgMembership.orgId, organizations.id),
          eq(orgMembership.userId, userId),
        ),
      )
      .where(eq(organizations.slug, orgSlug))
      .limit(1)

    if (!row) {
      return { valid: false, reason: "org_not_found" }
    }
    if (!row.membershipId) {
      return { valid: false, reason: "not_a_member" }
    }
    return { valid: true }
  } catch (error) {
    console.error("[org-validation] Error validating org access:", error)
    return { valid: false, reason: "org_not_found" }
  }
}
