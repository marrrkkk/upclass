"use client"

import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { organizationQueryOptions } from "@/lib/queries/organizations"
import { useOrgStore } from "@/stores/org-store"

export function useOrganizations() {
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg)

  const organizationsQuery = useQuery(organizationQueryOptions)

  const organizations = useMemo(
    () => organizationsQuery.data ?? [],
    [organizationsQuery.data],
  )

  // Keep the persisted selection consistent with the server list.
  useEffect(() => {
    if (organizationsQuery.isSuccess && !currentOrg && organizations.length > 0) {
      setCurrentOrg(organizations[0])
    }
  }, [currentOrg, organizations, organizationsQuery.isSuccess, setCurrentOrg])

  return {
    currentOrg,
    organizations,
    setCurrentOrg,
    isLoading: organizationsQuery.isLoading,
    refetch: organizationsQuery.refetch,
  }
}