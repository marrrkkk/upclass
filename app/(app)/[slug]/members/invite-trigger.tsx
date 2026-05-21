"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InviteMemberDialog } from "@/components/organizations/invite-member-dialog"

export function InviteTrigger({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Invite Member
      </Button>
      <InviteMemberDialog orgId={orgId} open={open} onOpenChange={setOpen} />
    </>
  )
}
