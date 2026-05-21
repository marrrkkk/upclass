import { create } from "zustand"
import { persist } from "zustand/middleware"

type OrgRole = "admin" | "teacher" | "student"

type OrgInfo = {
  id: string
  name: string
  slug: string
  role: OrgRole
  logo?: string | null
}

type OrgState = {
  activeOrgId: string | null
  activeOrgSlug: string | null
  orgs: OrgInfo[]
  setActiveOrg: (slug: string) => void
  setOrgs: (orgs: OrgInfo[]) => void
}

function setOrgSlugCookie(slug: string | null) {
  if (typeof document === "undefined") return
  if (slug) {
    document.cookie = `x-org-slug=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  } else {
    document.cookie = `x-org-slug=; path=/; max-age=0; SameSite=Lax`
  }
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      activeOrgId: null,
      activeOrgSlug: null,
      orgs: [],

      setActiveOrg: (slug: string) => {
        const { orgs } = get()
        const org = orgs.find((o) => o.slug === slug)
        if (org) {
          set({ activeOrgId: org.id, activeOrgSlug: org.slug })
          setOrgSlugCookie(org.slug)
        }
      },

      setOrgs: (orgs: OrgInfo[]) => {
        set({ orgs })
        // If active org is no longer in the list, clear it
        const { activeOrgSlug } = get()
        if (activeOrgSlug && !orgs.find((o) => o.slug === activeOrgSlug)) {
          set({ activeOrgId: null, activeOrgSlug: null })
          setOrgSlugCookie(null)
        }
      },
    }),
    {
      name: "org-store",
      partialize: (state) => ({
        activeOrgId: state.activeOrgId,
        activeOrgSlug: state.activeOrgSlug,
      }),
    }
  )
)
