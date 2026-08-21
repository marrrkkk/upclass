"use client"

import * as React from "react"
import { MailCheck, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
} from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  ORG_ROLE_LABELS,
  ORG_ROLE_TONES,
  type OrganizationInvitation,
  type OrgRole,
} from "@/types/organization"

type OrgInvitationsTableProps = {
  invitations: OrganizationInvitation[]
  currentRole: Extract<OrgRole, "owner" | "admin">
  pending: boolean
  /** Absolute origin used to build shareable invite links. */
  inviteOrigin: string
  onRevoke: (invitation: OrganizationInvitation) => void
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Days remaining, plus the tone that communicates urgency. */
function expiry(expiresAt: Date | string) {
  const target = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt
  const remainingMs = target.getTime() - Date.now()

  if (remainingMs <= 0) return { label: "Expired", tone: "danger" as const }

  const days = Math.ceil(remainingMs / DAY_MS)
  if (days <= 1) return { label: "Expires today", tone: "warning" as const }
  if (days <= 2) return { label: `${days} days left`, tone: "warning" as const }
  return { label: `${days} days left`, tone: "neutral" as const }
}

/**
 * Pending invitations.
 *
 * The shareable link is the useful artefact here — email delivery can fail, so an
 * admin needs to be able to hand the link over directly.
 */
export function OrgInvitationsTable({
  invitations,
  currentRole,
  pending,
  inviteOrigin,
  onRevoke,
}: OrgInvitationsTableProps) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableHeadCell>Invited</DataTableHeadCell>
        <DataTableHeadCell hideBelow="sm">Access</DataTableHeadCell>
        <DataTableHeadCell hideBelow="md">Status</DataTableHeadCell>
        <DataTableHeadCell align="right">
          <span className="sr-only">Actions</span>
        </DataTableHeadCell>
      </DataTableHead>

      <DataTableBody>
        {invitations.length === 0 ? (
          <DataTableEmptyRow colSpan={4}>
            <EmptyState
              icon={<MailCheck />}
              tone="success"
              title="No pending invitations"
              description="Everyone you invited has joined. New invites will appear here until they are accepted."
            />
          </DataTableEmptyRow>
        ) : (
          invitations.map((invitation) => {
            const status = expiry(invitation.expiresAt)
            const canRevoke =
              currentRole === "owner" || invitation.role === "member" || invitation.role === "student"
            const inviteLink = `${inviteOrigin}/org/join?token=${invitation.token}`

            return (
              <DataTableRow key={invitation.id}>
                <DataTableCell>
                  <div className="min-w-0">
                    <span className={cn(typographyVariants({ variant: "h4" }), "block truncate")}>
                      {invitation.email}
                    </span>
                    <span
                      className={cn(
                        typographyVariants({ variant: "caption", tone: "subtle" }),
                        "block truncate",
                      )}
                    >
                      {invitation.invitedByName ? `Invited by ${invitation.invitedByName}` : "Invited"}
                      <span className="sm:hidden"> &middot; {ORG_ROLE_LABELS[invitation.role]}</span>
                    </span>
                  </div>
                </DataTableCell>

                <DataTableCell hideBelow="sm">
                  <StatusBadge tone={ORG_ROLE_TONES[invitation.role]}>
                    {ORG_ROLE_LABELS[invitation.role]}
                  </StatusBadge>
                </DataTableCell>

                <DataTableCell hideBelow="md">
                  <StatusBadge tone={status.tone} dot>
                    {status.label}
                  </StatusBadge>
                </DataTableCell>

                <DataTableCell align="right">
                  <div className="flex items-center justify-end gap-1">
                    <CopyButton
                      value={inviteLink}
                      label={`invite link for ${invitation.email}`}
                      copiedLabel="Link copied"
                      size="sm"
                      showLabel
                    />
                    {canRevoke ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        onClick={() => onRevoke(invitation)}
                        aria-label={`Revoke invitation for ${invitation.email}`}
                        className="text-muted-foreground hover:bg-destructive-surface hover:text-destructive-text"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </DataTableCell>
              </DataTableRow>
            )
          })
        )}
      </DataTableBody>
    </DataTable>
  )
}
