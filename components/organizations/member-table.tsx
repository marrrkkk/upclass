"use client"

import { useState, useTransition } from "react"
import { UserMinus } from "lucide-react"

import { type OrgRole } from "@/lib/validation/organizations"
import { changeRole, removeMember } from "@/app/actions/org-members"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export type MemberInfo = {
  id: string
  userId: string
  name: string
  email: string
  image: string | null
  role: OrgRole
}

type MemberTableProps = {
  members: MemberInfo[]
  currentUserRole: OrgRole
  orgId: string
}

const roleBadgeVariant: Record<OrgRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  teacher: "secondary",
  student: "outline",
}

export function MemberTable({ members, currentUserRole, orgId }: MemberTableProps) {
  const isAdmin = currentUserRole === "admin"

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">Avatar</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          {isAdmin && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isAdmin={isAdmin}
            orgId={orgId}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function MemberRow({
  member,
  isAdmin,
  orgId,
}: {
  member: MemberInfo
  isAdmin: boolean
  orgId: string
}) {
  const [isPendingRole, startRoleTransition] = useTransition()
  const [isPendingRemove, startRemoveTransition] = useTransition()

  function handleRoleChange(newRole: string) {
    startRoleTransition(async () => {
      await changeRole(orgId, member.userId, newRole)
    })
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      await removeMember(orgId, member.userId)
    })
  }

  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <TableRow>
      <TableCell>
        <Avatar className="size-8">
          <AvatarImage src={member.image ?? undefined} alt={member.name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="font-medium">{member.name}</TableCell>
      <TableCell className="text-muted-foreground">{member.email}</TableCell>
      <TableCell>
        {isAdmin ? (
          <Select
            value={member.role}
            onValueChange={handleRoleChange}
            disabled={isPendingRole}
          >
            <SelectTrigger size="sm" className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={roleBadgeVariant[member.role]}>
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Badge>
        )}
      </TableCell>
      {isAdmin && (
        <TableCell className="text-right">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPendingRemove}
                aria-label={`Remove ${member.name}`}
              >
                <UserMinus className="size-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {member.name} from this
                  organization? This will also revoke their access to all
                  organization classes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isPendingRemove ? "Removing…" : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      )}
    </TableRow>
  )
}
