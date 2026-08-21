import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { classes, orgMembership, organizations } from "@/db/schema"

/**
 * Revalidation helpers for tenant-scoped routes.
 *
 * Every application route lives under a dynamic `[orgSlug]` segment, so bare
 * paths like `/classes` or `/home` never match a real route and silently do
 * nothing. These helpers scope `revalidatePath` calls to concrete org routes
 * so mutations refresh the pages that actually display the changed data.
 */

/**
 * Revalidates one or more paths inside a single organization.
 *
 * Paths are relative to the org root, e.g. `["classes", "classes/c-1", "home"]`.
 */
export function revalidateOrg(orgSlug: string, paths: string[]): void {
  for (const path of paths) {
    revalidatePath(`/${orgSlug}/${path}`)
  }
}

/**
 * Resolves the org slug for a class so class-scoped mutations can revalidate
 * the correct tenant routes.
 */
export async function getOrgSlugForClassId(classId: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: organizations.slug })
    .from(classes)
    .innerJoin(organizations, eq(classes.orgId, organizations.id))
    .where(eq(classes.id, classId))
    .limit(1)
  return row?.slug ?? null
}

/**
 * Resolves the org slugs a user belongs to, used by user-scoped mutations
 * (settings, profile, notifications, direct messages) that are not tied to a
 * single class or organization record.
 */
export async function getUserOrgSlugs(userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: organizations.slug })
    .from(orgMembership)
    .innerJoin(organizations, eq(orgMembership.orgId, organizations.id))
    .where(eq(orgMembership.userId, userId))
  return rows.map((row) => row.slug)
}

/** Revalidates paths inside the org that owns the given class. */
export async function revalidateClassOrg(classId: string, paths: string[]): Promise<void> {
  const orgSlug = await getOrgSlugForClassId(classId)
  if (orgSlug) {
    revalidateOrg(orgSlug, paths)
  }
}

/** Revalidates paths inside every org the user belongs to. */
export async function revalidateUserOrgs(userId: string, paths: string[]): Promise<void> {
  const slugs = await getUserOrgSlugs(userId)
  for (const slug of slugs) {
    revalidateOrg(slug, paths)
  }
}