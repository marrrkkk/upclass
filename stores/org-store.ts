import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { OrganizationSummary } from "@/types/organization"

type OrgStore = {
  currentOrg: OrganizationSummary | null
  setCurrentOrg: (org: OrganizationSummary | null) => void
}

export const useOrgStore = create<OrgStore>()(
  persist(
    (set) => ({
      currentOrg: null,
      setCurrentOrg: (org) => set({ currentOrg: org }),
    }),
    {
      name: "upclass-org-storage",
      partialize: (state) => ({
        currentOrg: state.currentOrg,
      }),
    },
  ),
)