"use client"

import { useCallback } from "react"
import { usePathname } from "next/navigation"

import { organizationPath, organizationSlugFromPathname } from "@/lib/organization-path"

/** Builds a path inside the organization currently represented by the URL. */
export function useOrganizationPath() {
  const pathname = usePathname()
  const orgSlug = organizationSlugFromPathname(pathname)

  return useCallback((path: string) => organizationPath(orgSlug, path), [orgSlug])
}
