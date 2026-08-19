"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, MailPlus, Search, Users, X } from "lucide-react"

import {
  createInvitation,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from "@/app/actions/organization"
import { OrgClassesTable } from "@/components/organization/org-classes-table"
import { OrgInvitationsTable } from "@/components/organization/org-invitations-table"
import { OrgInviteForm } from "@/components/organization/org-invite-form"
import { OrgMembersTable } from "@/components/organization/org-members-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { CopyButton } from "@/components/ui/copy-button"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { FilterToolbar } from "@/components/ui/filter-toolbar"
import { Input } from "@/components/ui/input"
import {
  Panel,
  PanelBody,
  PanelHeader,
  PanelHeading,
  PanelTitle,
  PanelDescription,
} from "@/components/ui/panel"
import { PageContainer, PageHeading } from "@/components/ui/section"
import { StatGroup, StatTile } from "@/components/ui/stat-tile"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Text } from "@/components/ui/typography"
import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"
import {
  ORG_ROLE_LABELS,
  ORG_ROLE_TONES,
  type AssignableOrgRole,
  type OrganizationClass,
  type OrganizationInvitation,
  type OrganizationMember,
  type OrgRole,
} from "@/types/organization"

type Feedback = { tone: "success" | "danger"; message: string } | null

type ConfirmState =
  | { kind: "remove-member"; member: OrganizationMember }
  | { kind: "revoke-invite"; invitation: OrganizationInvitation }
  | null

type OrganizationAdminClientProps = {
  organization: {
    id: string
    name: string
    slug: string
    description: string | null
    logo: string | null
  }
  currentRole: Extract<OrgRole, "owner" | "admin">
  currentUserId: string
  members: OrganizationMember[]
  classes: OrganizationClass[]
  invitations: OrganizationInvitation[]
  inviteOrigin: string
}

export function OrganizationAdminClient({
  organization,
  currentRole,
  currentUserId,
  members,
  classes,
  invitations,
  inviteOrigin,
}: OrganizationAdminClientProps) {
  const router = useRouter()
  const [feedback, setFeedback] = React.useState<Feedback>(null)
  const [confirm, setConfirm] = React.useState<ConfirmState>(null)
  const [pending, startTransition] = React.useTransition()
  const [peopleQuery, setPeopleQuery] = React.useState("")
  const [classQuery, setClassQuery] = React.useState("")
  const [invitationQuery, setInvitationQuery] = React.useState("")

  const teacherCount = React.useMemo(
    () => members.filter((member) => member.role === "admin").length,
    [members],
  )
  const studentCount = React.useMemo(
    () => members.filter((member) => member.role === "member").length,
    [members],
  )

  const filteredMembers = React.useMemo(() => {
    const query = normalizeQuery(peopleQuery)
    if (!query) return members
    return members.filter((member) =>
      [member.name, member.email, ORG_ROLE_LABELS[member.role]].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [members, peopleQuery])

  const filteredClasses = React.useMemo(() => {
    const query = normalizeQuery(classQuery)
    if (!query) return classes
    return classes.filter((classItem) =>
      [classItem.title, classItem.code, classItem.ownerName].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [classQuery, classes])

  const filteredInvitations = React.useMemo(() => {
    const query = normalizeQuery(invitationQuery)
    if (!query) return invitations
    return invitations.filter((invitation) =>
      [invitation.email, invitation.invitedByName || "", ORG_ROLE_LABELS[invitation.role]].some(
        (value) => value.toLowerCase().includes(query),
      ),
    )
  }, [invitationQuery, invitations])

  const run = React.useCallback(
    (action: () => Promise<{ success: boolean; error?: string }>, successMessage: string) => {
      startTransition(async () => {
        const result = await action()
        if (!result.success) {
          setFeedback({ tone: "danger", message: result.error ?? "Something went wrong" })
          return
        }
        setFeedback({ tone: "success", message: successMessage })
        router.refresh()
      })
    },
    [router],
  )

  const handleInvite = React.useCallback(
    ({ email, role }: { email: string; role: AssignableOrgRole }) => {
      setFeedback(null)
      startTransition(async () => {
        const result = await createInvitation({ orgId: organization.id, email, role })
        if (!result.success) {
          setFeedback({ tone: "danger", message: result.error })
          return
        }

        const token = result.data?.token
        if (!token) {
          setFeedback({ tone: "danger", message: "The invitation was created without a shareable link" })
          router.refresh()
          return
        }

        const link = `${inviteOrigin}/org/join?token=${token}`
        let copied = false
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(link)
            copied = true
          }
        } catch {
          copied = false
        }

        setFeedback({
          tone: "success",
          message: copied
            ? `Invite created for ${email} and copied to the clipboard.`
            : `Invite created for ${email}. Copy its link from Invitations.`,
        })
        router.refresh()
      })
    },
    [inviteOrigin, organization.id, router],
  )

  const handleChangeRole = React.useCallback(
    (member: OrganizationMember, role: AssignableOrgRole) => {
      setFeedback(null)
      run(
        () => updateMemberRole({ orgId: organization.id, userId: member.id, role }),
        `${member.name} is now a ${ORG_ROLE_LABELS[role].toLowerCase()}.`,
      )
    },
    [organization.id, run],
  )

  const confirmAction = React.useCallback(() => {
    if (!confirm) return
    setFeedback(null)

    if (confirm.kind === "remove-member") {
      const { member } = confirm
      run(
        () => removeMember({ orgId: organization.id, userId: member.id }),
        `${member.name} was removed from ${organization.name}.`,
      )
    } else {
      const { invitation } = confirm
      run(
        () => revokeInvitation({ orgId: organization.id, invitationId: invitation.id }),
        `The invitation for ${invitation.email} was revoked.`,
      )
    }

    setConfirm(null)
  }, [confirm, organization.id, organization.name, run])

  return (
    <PageContainer width="wide">
      <PageHeading
        eyebrow="Organization"
        title={organization.name}
        description={organization.description || "Manage members, invitations, and classes."}
        media={
          <EntityAvatar
            name={organization.name}
            image={organization.logo}
            colorKey={organization.slug}
            shape="square"
            size="xl"
            className="hidden sm:flex"
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={ORG_ROLE_TONES[currentRole]} size="md" dot>
              {ORG_ROLE_LABELS[currentRole]} access
            </StatusBadge>
            <span className="flex items-center gap-0.5 rounded-md border border-hairline bg-card px-2 py-1">
              <span className={typographyVariants({ variant: "mono", tone: "muted" })}>
                /{organization.slug}
              </span>
              <CopyButton value={`${inviteOrigin}/${organization.slug}/dashboard`} label="workspace link" />
            </span>
          </div>
        }
      />

      <StatGroup columns={4}>
        <StatTile label="People" value={members.length} tone="primary" />
        <StatTile label="Teachers" value={teacherCount} tone="info" />
        <StatTile label="Students" value={studentCount} />
        <StatTile
          label="Pending invites"
          value={invitations.length}
          tone={invitations.length > 0 ? "warning" : "success"}
        />
      </StatGroup>

      {feedback ? (
        <Callout
          tone={feedback.tone}
          role={feedback.tone === "danger" ? "alert" : "status"}
          action={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss message"
              className="-my-1 text-current/70 hover:bg-current/10 hover:text-current"
            >
              <X aria-hidden="true" className="size-3.5" />
            </Button>
          }
        >
          {feedback.message}
        </Callout>
      ) : null}

      <Panel padding="none">
        <PanelHeader>
          <PanelHeading>
            <PanelTitle>
              <MailPlus aria-hidden="true" className="size-4 text-muted-foreground" />
              Invite people
            </PanelTitle>
            <PanelDescription>Invitation links expire after seven days.</PanelDescription>
          </PanelHeading>
        </PanelHeader>
        <PanelBody className="p-5 sm:p-6">
          <OrgInviteForm currentRole={currentRole} pending={pending} onSubmit={handleInvite} />
        </PanelBody>
      </Panel>

      <Tabs defaultValue="people" variant="solid">
        <TabsList aria-label="Organization sections">
          <TabsTrigger value="people">
            <Users aria-hidden="true" />
            People
            <TabCount value={members.length} />
          </TabsTrigger>
          <TabsTrigger value="classes">
            <GraduationCap aria-hidden="true" />
            Classes
            <TabCount value={classes.length} />
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <MailPlus aria-hidden="true" />
            Invitations
            <TabCount value={invitations.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="space-y-3">
          <CollectionFilter
            label="Filter people"
            placeholder="Name, email, or access"
            value={peopleQuery}
            onChange={setPeopleQuery}
            visible={filteredMembers.length}
            total={members.length}
          />
          <Panel padding="none" className="overflow-hidden">
            {filteredMembers.length === 0 && members.length > 0 ? (
              <EmptyState
                icon={<Search />}
                title="No matching people"
                description="Try a different name, email, or access level."
              />
            ) : (
              <OrgMembersTable
                members={filteredMembers}
                currentRole={currentRole}
                currentUserId={currentUserId}
                pending={pending}
                onChangeRole={handleChangeRole}
                onRemove={(member) => setConfirm({ kind: "remove-member", member })}
              />
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="classes" className="space-y-3">
          <CollectionFilter
            label="Filter classes"
            placeholder="Class, teacher, or join code"
            value={classQuery}
            onChange={setClassQuery}
            visible={filteredClasses.length}
            total={classes.length}
          />
          <Panel padding="none" className="overflow-hidden">
            {filteredClasses.length === 0 && classes.length > 0 ? (
              <EmptyState
                icon={<Search />}
                title="No matching classes"
                description="Try a different class, teacher, or join code."
              />
            ) : (
              <OrgClassesTable classes={filteredClasses} orgSlug={organization.slug} />
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-3">
          <CollectionFilter
            label="Filter invitations"
            placeholder="Email, inviter, or access"
            value={invitationQuery}
            onChange={setInvitationQuery}
            visible={filteredInvitations.length}
            total={invitations.length}
          />
          <Panel padding="none" className="overflow-hidden">
            {filteredInvitations.length === 0 && invitations.length > 0 ? (
              <EmptyState
                icon={<Search />}
                title="No matching invitations"
                description="Try a different email, inviter, or access level."
              />
            ) : (
              <OrgInvitationsTable
                invitations={filteredInvitations}
                currentRole={currentRole}
                pending={pending}
                inviteOrigin={inviteOrigin}
                onRevoke={(invitation) => setConfirm({ kind: "revoke-invite", invitation })}
              />
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "remove-member"
                ? `Remove ${confirm.member.name}?`
                : "Revoke this invitation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "remove-member"
                ? `They will lose access to ${organization.name} and every class inside it. Their submitted work is kept.`
                : `The invite link for ${
                    confirm?.kind === "revoke-invite" ? confirm.invitation.email : "this person"
                  } will stop working immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirm?.kind === "remove-member" ? "Remove member" : "Revoke invite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}

function CollectionFilter({
  label,
  placeholder,
  value,
  onChange,
  visible,
  total,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  visible: number
  total: number
}) {
  return (
    <FilterToolbar
      label={label}
      filters={
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={value}
            aria-label={label}
            placeholder={placeholder}
            className="pl-9"
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      }
      summary={
        <Text variant="caption" tone="muted" as="span" className="numeric-tabular">
          {visible} of {total}
        </Text>
      }
    />
  )
}

function TabCount({ value }: { value: number }) {
  if (value === 0) return null

  return (
    <Text
      variant="caption"
      tone="subtle"
      as="span"
      className={cn("numeric-tabular rounded-full bg-muted px-1.5 py-0.5 leading-none")}
    >
      {value}
    </Text>
  )
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase()
}
