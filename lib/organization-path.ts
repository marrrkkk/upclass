/** Cookie the proxy updates on every validated org visit so `/entry` can resolve the most recent workspace. */
export const LAST_ORG_COOKIE = "upclass-last-org"

/** Normalizes a destination and keeps it inside the selected organization. */
export function organizationPath(
  orgSlug: string | null | undefined,
  path: string,
) {
  const slug = orgSlug?.replace(/^\/+|\/+$/g, "")
  const normalizedPath = `/${path.replace(/^\/+/, "")}`

  if (!slug) return normalizedPath
  if (normalizedPath === `/${slug}` || normalizedPath.startsWith(`/${slug}/`)) {
    return normalizedPath
  }

  return normalizedPath === "/" ? `/${slug}` : `/${slug}${normalizedPath}`
}

/** Returns the organization segment represented by a tenant-scoped pathname. */
export function organizationSlugFromPathname(pathname: string | null | undefined) {
  return pathname?.split("/").filter(Boolean)[0] ?? null
}
