"use client"

import * as React from "react"
import { MoreHorizontal, ShieldCheck, UserMinus, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"
import { Button } from "@/components/ui/button"
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
} from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  ORG_ROLE_LABELS,
  ORG_ROLE_TONES,
  type AssignableOrgRole,
  type OrganizationMember,
  type OrgRole,
} from "@/types/organization"

/**
 * Absolute date rather than "3 months ago": admins compare joining dates against
 * term start, and a relative label makes that harder, not easier.
 */
function formatJoinedAt(value: OrganizationMember["joinedAt"]) {
  if (!value) return "\u2014"

  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "\u2014"

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

type OrgMembersTableProps = {
  members: OrganizationMember[]
  currentRole: Extract<OrgRole, "owner" | "admin">
  currentUserId: string
  pending: boolean
  onChangeRole: (member: OrganizationMember, role: AssignableOrgRole) => void
  onRemove: (member: OrganizationMember) => void
}

/**
 * People table.
 *
 * Identity is one column so name and email read as a unit; role and actions get
 * their own. Email collapses into the identity cell below `md`, which keeps the
 * table usable on a phone without a horizontal scroll.
 */
export function OrgMembersTable({
  members,
  currentRole,
  currentUserId,
  pending,
  onChangeRole,
  onRemove,
}: OrgMembersTableProps) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableHeadCell>Member</DataTableHeadCell>
        <DataTableHeadCell hideBelow="md">Email</DataTableHeadCell>
        <DataTableHeadCell>Access</DataTableHeadCell>
        <DataTableHeadCell hideBelow="lg">Joined</DataTableHeadCell>
        <DataTableHeadCell align="right">
          <span className="sr-only">Actions</span>
        </DataTableHeadCell>
      </DataTableHead>

      <DataTableBody>
        {members.length === 0 ? (
          <DataTableEmptyRow colSpan={5}>
            <EmptyState
              icon={<Users />}
              title="No members yet"
              description="Invite teachers and students by email to get this organization running."
            />
          </DataTableEmptyRow>
        ) : (
          members.map((member) => {
            const isSelf = member.id === currentUserId
            const isOwner = member.role === "owner"
            // Owners manage everyone; admins manage students only.
            const canRemove =
              !isOwner &&
              !isSelf &&
              (currentRole === "owner" || member.role === "student" || member.role === "member")
            const canChangeRole = currentRole === "owner" && !isOwner && !isSelf
            const hasActions = canRemove || canChangeRole

            return (
              <DataTableRow key={member.id}>
                <DataTableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <EntityAvatar name={member.name} image={member.image} size="sm" colorKey={member.id} />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn(typographyVariants({ variant: "h4" }), "truncate")}>
                          {member.name}
                        </span>
                        {isSelf ? (
                          <span className={typographyVariants({ variant: "caption", tone: "subtle" })}>
                            You
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          typographyVariants({ variant: "caption", tone: "subtle" }),
                          "block truncate md:hidden",
                        )}
                      >
                        {member.email}
                      </span>
                    </div>
                  </div>
                </DataTableCell>

                <DataTableCell hideBelow="md">
                  <span
                    className={cn(typographyVariants({ variant: "small", tone: "muted" }), "truncate")}
                  >
                    {member.email}
                  </span>
                </DataTableCell>

                <DataTableCell>
                  <StatusBadge tone={ORG_ROLE_TONES[member.role]} dot={isOwner}>
                    {ORG_ROLE_LABELS[member.role]}
                  </StatusBadge>
                </DataTableCell>

                <DataTableCell hideBelow="lg">
                  <span
                    className={cn(
                      typographyVariants({ variant: "small", tone: "subtle" }),
                      "numeric-tabular whitespace-nowrap",
                    )}
                  >
                    {formatJoinedAt(member.joinedAt)}
                  </span>
                </DataTableCell>

                <DataTableCell align="right">
                  {hasActions ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          aria-label={`Manage ${member.name}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="type-caption font-normal text-muted-foreground">
                          {member.email}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canChangeRole ? (
                          <DropdownMenuItem
                            onClick={() =>
                              onChangeRole(
                                member,
                                member.role === "admin"
                                  ? ("teacher" as AssignableOrgRole)
                                  : ("admin" as AssignableOrgRole),
                              )
                            }
                          >
                            <ShieldCheck aria-hidden="true" />
                            {member.role === "admin"
                              ? `Change to ${ORG_ROLE_LABELS.teacher}`
                              : `Change to ${ORG_ROLE_LABELS.admin}`}
                          </DropdownMenuItem>
                        ) : null}
                        {canRemove ? (
                          <DropdownMenuItem variant="destructive" onClick={() => onRemove(member)}>
                            <UserMinus aria-hidden="true" />
                            Remove from organization
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className={typographyVariants({ variant: "caption", tone: "subtle" })}>
                      &mdash;
                    </span>
                  )}
                </DataTableCell>
              </DataTableRow>
            )
          })
        )}
      </DataTableBody>
    </DataTable>
  )
}
