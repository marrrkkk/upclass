"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { organization, orgMembership } from "@/db/schema"
import { orgNameSchema, updateOrgSettingsSchema } from "@/lib/validation/organizations"
import { generateUniqueSlug } from "@/lib/org-slug"

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Create a new organization.
 * The creating user becomes an admin member automatically.
 */
export async function createOrganization(input: {
  name: string
  description?: string
}): Promise<ActionResult<{ id: string; slug: string }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Validate name
  const nameResult = orgNameSchema.safeParse(input.name)
  if (!nameResult.success) {
    return { success: false, error: nameResult.error.issues[0]?.message || "Invalid organization name" }
  }

  try {
    // Fetch existing slugs to ensure uniqueness
    const existingOrgs = await db
      .select({ slug: organization.slug })
      .from(organization)

    const existingSlugs = existingOrgs.map((o) => o.slug)
    const slug = generateUniqueSlug(input.name, existingSlugs)

    const orgId = crypto.randomUUID()

    // Create org + admin membership atomically
    await db.transaction(async (tx) => {
      await tx.insert(organization).values({
        id: orgId,
        name: nameResult.data,
        slug,
        description: input.description || null,
        createdBy: session.user.id,
      })

      await tx.insert(orgMembership).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: session.user.id,
        role: "admin",
      })
    })

    revalidatePath("/")

    return { success: true, data: { id: orgId, slug } }
  } catch (error) {
    console.error("createOrganization error", error)
    return { success: false, error: "Failed to create organization" }
  }
}

/**
 * Get organization details by slug.
 * Only accessible to org members.
 */
export async function getOrganization(
  slug: string
): Promise<ActionResult<{
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  createdBy: string
  createdAt: Date
}>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Fetch the organization
    const orgs = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1)

    if (orgs.length === 0) {
      return { success: false, error: "Organization not found" }
    }

    const org = orgs[0]

    // Check membership
    const membership = await db
      .select()
      .from(orgMembership)
      .where(
        and(
          eq(orgMembership.organizationId, org.id),
          eq(orgMembership.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return { success: false, error: "Organization not found" }
    }

    return {
      success: true,
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        logo: org.logo,
        createdBy: org.createdBy,
        createdAt: org.createdAt,
      },
    }
  } catch (error) {
    console.error("getOrganization error", error)
    return { success: false, error: "Failed to fetch organization" }
  }
}

/**
 * Update organization settings (name, description, logo).
 * Slug remains unchanged per requirement 10.5.
 * Admin-only.
 */
export async function updateOrganizationSettings(input: {
  orgId: string
  name: string
  description?: string
  logo?: string
}): Promise<ActionResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Validate input
  const parsed = updateOrgSettingsSchema.safeParse({
    name: input.name,
    description: input.description,
    logo: input.logo,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }

  try {
    // Verify user is admin of the org
    const membership = await db
      .select({ role: orgMembership.role })
      .from(orgMembership)
      .where(
        and(
          eq(orgMembership.organizationId, input.orgId),
          eq(orgMembership.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0 || membership[0].role !== "admin") {
      return { success: false, error: "Insufficient permissions" }
    }

    // Update org settings (slug unchanged)
    await db
      .update(organization)
      .set({
        name: parsed.data.name,
        description: parsed.data.description || null,
        logo: parsed.data.logo || null,
      })
      .where(eq(organization.id, input.orgId))

    revalidatePath("/")

    return { success: true, data: undefined }
  } catch (error) {
    console.error("updateOrganizationSettings error", error)
    return { success: false, error: "Failed to update organization settings" }
  }
}

/**
 * Delete an organization.
 * Admin-only. Cascade deletes handled by database foreign keys.
 */
export async function deleteOrganization(
  orgId: string
): Promise<ActionResult<void>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify user is admin of the org
    const membership = await db
      .select({ role: orgMembership.role })
      .from(orgMembership)
      .where(
        and(
          eq(orgMembership.organizationId, orgId),
          eq(orgMembership.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0 || membership[0].role !== "admin") {
      return { success: false, error: "Insufficient permissions" }
    }

    // Delete org — cascades handle memberships, invitations, resources
    await db.delete(organization).where(eq(organization.id, orgId))

    revalidatePath("/")

    return { success: true, data: undefined }
  } catch (error) {
    console.error("deleteOrganization error", error)
    return { success: false, error: "Failed to delete organization" }
  }
}

/**
 * List all organizations the current user belongs to, with their role in each.
 */
export async function getUserOrganizations(): Promise<
  ActionResult<
    Array<{
      id: string
      name: string
      slug: string
      description: string | null
      logo: string | null
      role: "admin" | "teacher" | "student"
    }>
  >
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const memberships = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        logo: organization.logo,
        role: orgMembership.role,
      })
      .from(orgMembership)
      .innerJoin(organization, eq(orgMembership.organizationId, organization.id))
      .where(eq(orgMembership.userId, session.user.id))

    return { success: true, data: memberships }
  } catch (error) {
    console.error("getUserOrganizations error", error)
    return { success: false, error: "Failed to fetch organizations" }
  }
}
