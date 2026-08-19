"use client"

import type { QueryClient } from "@tanstack/react-query"

import { orgKeys } from "@/hooks/query-keys"
import type { OrganizationSummary } from "@/types/organization"

export async function fetchOrganizations(): Promise<OrganizationSummary[]> {
  const response = await fetch("/api/organizations/list")

  if (!response.ok) {
    throw new Error(`Failed to fetch organizations: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.success && Array.isArray(data.data)) {
    return data.data as OrganizationSummary[]
  }

  return []
}

/** Shared query options so consumers and prefetchers stay consistent. */
export const organizationQueryOptions = {
  queryKey: orgKeys.all,
  queryFn: fetchOrganizations,
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
} as const

export function prefetchOrganizations(queryClient: QueryClient) {
  return queryClient.prefetchQuery(organizationQueryOptions)
}