import { headers } from "next/headers";

/**
 * Reads the active organization slug from the request headers.
 * The middleware injects this from the `x-org-slug` cookie.
 *
 * Returns `null` when no org context is active (e.g. user hasn't
 * selected an organization yet, or is on a non-org route).
 */
export async function getActiveOrgSlug(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-org-slug") || null;
}
