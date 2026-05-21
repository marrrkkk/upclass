"use client"

import { useEffect, useState } from "react"

import { useOrgStore } from "@/stores/org-store"
import { OrgSwitcher } from "@/components/layouts/org-switcher"
import { OrgCreateDialog } from "@/components/organizations/org-create-dialog"

type OrgInfo = {
  id: string
  name: string
  slug: string
  role: "admin" | "teacher" | "student"
  logo?: string | null
}

type OrgSwitcherWrapperProps = {
  orgs: OrgInfo[]
}

export function OrgSwitcherWrapper({ orgs }: OrgSwitcherWrapperProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const setOrgs = useOrgStore((s) => s.setOrgs)

  useEffect(() => {
    setOrgs(orgs)
  }, [orgs, setOrgs])

  return (
    <>
      <OrgSwitcher onCreateOrg={() => setCreateOpen(true)} />
      <OrgCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
