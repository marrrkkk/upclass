"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreVertical, UserMinus, Users } from "lucide-react"

import { removeMember } from "@/app/actions/class-detail"
import { regenerateClassEnrollmentCode } from "@/app/actions/classes"
import { MemberSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { CopyButton } from "@/components/ui/copy-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { IconBadge } from "@/components/ui/icon-badge"
import {
  Panel,
  PanelActions,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { useOrganizationPath } from "@/hooks/use-organization-path"

type MemberData = {
  id: string
  name: string
  email: string
  image: string | null
  role: "teacher" | "student"
}

type PeopleTabProps = {
  classId: string
  classCode?: string
  userId?: string
  userRole: "teacher" | "student" | null
  members: MemberData[]
  showSetupChecklist?: boolean
}

function MemberRow({
  member,
  href,
  actions,
}: {
  member: MemberData
  href: string
  actions?: React.ReactNode
}) {
  return (
    <div role="listitem" className="group flex items-center gap-2 border-t border-hairline first:border-t-0">
      <Link href={href} className="touch-target row-interactive focus-ring flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5">
        <EntityAvatar name={member.name} image={member.image} colorKey={member.id} size="sm" />
        <div className="min-w-0 flex-1">
          <Text variant="h4" truncate>{member.name}</Text>
          <Text variant="caption" tone="muted" truncate>{member.email}</Text>
        </div>
      </Link>
      {actions ? <div className="pr-3 sm:pr-4">{actions}</div> : null}
    </div>
  )
}

export function PeopleTab({
  classId,
  classCode,
  userRole,
  members,
  showSetupChecklist = false,
}: PeopleTabProps) {
  const router = useRouter()
  const organizationPath = useOrganizationPath()
  const teachers = members.filter((member) => member.role === "teacher")
  const students = members.filter((member) => member.role === "student")

  const [removeMemberOpen, setRemoveMemberOpen] = useState<string | null>(null)
  const [removePending, startRemoveTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [checklistDismissed, setChecklistDismissed] = useState(false)
  const [activeCode, setActiveCode] = useState(classCode ?? "")
  const [codePending, startCodeTransition] = useTransition()

  const enrollmentLink =
    typeof window !== "undefined" && activeCode
      ? `${window.location.origin}/org/join?code=${activeCode}`
      : ""

  const memberToRemove = members.find((member) => member.id === removeMemberOpen)

  const handleRemoveMember = (memberId: string) => {
    setRemovingId(memberId)
    setRemoveMemberOpen(null)
    startRemoveTransition(async () => {
      const res = await removeMember(classId, memberId)
      if (res.success) {
        router.refresh()
      }
      setRemovingId(null)
    })
  }

  return (
    <section className="space-y-4">
      {showSetupChecklist && userRole === "teacher" && !checklistDismissed ? (
        <Callout tone="info" className="relative pr-12">
          <div className="space-y-3">
            <div>
              <Text variant="h4">Finish inviting students</Text>
              <Text variant="small" tone="muted">
                Share your enrollment link or code, then watch this roster grow.
              </Text>
            </div>
            {activeCode ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <code className="type-mono rounded bg-surface-sunken px-2 py-1 text-sm font-semibold tracking-widest">{activeCode}</code>
                <CopyButton value={enrollmentLink || activeCode} label="Copy enrollment link" showLabel />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={codePending}
                  onClick={() => {
                    startCodeTransition(async () => {
                      const result = await regenerateClassEnrollmentCode(classId)
                      if (result.success && result.data) {
                        setActiveCode(result.data.code)
                        router.refresh()
                      }
                    })
                  }}
                >
                  Regenerate
                </Button>
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => setChecklistDismissed(true)}
          >
            Dismiss
          </Button>
        </Callout>
      ) : null}

      <Panel padding="none" className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
        <PanelHeader className="pb-3">
          <PanelHeading>
            <PanelTitle>Teachers</PanelTitle>
            <PanelDescription>Course instructors and teaching staff.</PanelDescription>
          </PanelHeading>
          <PanelActions><StatusBadge tone="neutral">{teachers.length}</StatusBadge></PanelActions>
        </PanelHeader>
        {teachers.length === 0 ? (
          <EmptyState title="No teachers assigned" description="No teaching staff are listed for this course." />
        ) : (
          <div role="list" aria-label="Teachers">
            {teachers.map((member) =>
              removingId === member.id ? (
                <div key={member.id} role="listitem">
                  <MemberSkeleton />
                </div>
              ) : (
                <MemberRow key={member.id} member={member} href={organizationPath(`/user/${member.id}`)} />
              ),
            )}
          </div>
        )}
      </Panel>

      <Panel padding="none" className="overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
        <PanelHeader className="pb-3">
          <PanelHeading>
            <PanelTitle>Students</PanelTitle>
            <PanelDescription>Everyone currently enrolled in this course.</PanelDescription>
          </PanelHeading>
          <PanelActions>
            <StatusBadge tone="neutral">{students.length} students</StatusBadge>
          </PanelActions>
        </PanelHeader>
        {students.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No students enrolled yet"
            description="Students will appear here after they join the class."
          />
        ) : (
          <div role="list" aria-label="Students">
            {students.map((member) => {
              if (removingId === member.id) {
                return (
                  <div key={member.id} role="listitem">
                    <MemberSkeleton />
                  </div>
                )
              }

              return (
                <MemberRow
                  key={member.id}
                  member={member}
                  href={organizationPath(`/user/${member.id}`)}
                  actions={
                    userRole === "teacher" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${member.name}`}
                            className="text-muted-foreground opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                          >
                            <MoreVertical aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setRemoveMemberOpen(member.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus />
                            Remove from class
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null
                  }
                />
              )
            })}
          </div>
        )}
      </Panel>

      <Dialog open={!!removeMemberOpen} onOpenChange={(open) => !open && setRemoveMemberOpen(null)}>
        <DialogContent className="sm:max-w-[26rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconBadge tone="danger" size="sm"><UserMinus /></IconBadge>
              Remove student
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {memberToRemove ? (
            <div className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-sunken p-3">
              <EntityAvatar name={memberToRemove.name} image={memberToRemove.image} colorKey={memberToRemove.id} />
              <div className="min-w-0">
                <Text variant="h4" truncate>{memberToRemove.name}</Text>
                <Text variant="caption" tone="muted" truncate>{memberToRemove.email}</Text>
              </div>
            </div>
          ) : null}
          <Callout tone="danger" icon={false}>
            The student will no longer have access to this class.
          </Callout>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveMemberOpen(null)} disabled={removePending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove.id)}
              disabled={removePending}
            >
              <UserMinus aria-hidden="true" />
              {removePending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
