"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, MailPlus, Search, Settings2, Users, X } from "lucide-react"

import {
  createInvitation,
  removeMember,
  revokeInvitation,
  updateMemberRole,
  updateOrganization,
} from "@/app/actions/organization"
import { OrgClassesTable } from "@/components/organization/org-classes-table"
import { OrgIdentityFields, persistOrgIdentity, type OrgIdentityValue } from "@/components/organization/org-identity-fields"
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
import { Field, FieldGroup, FieldHelp, FieldLabel } from "@/components/ui/field"
import { FilterToolbar } from "@/components/ui/filter-toolbar"
import { Input } from "@/components/ui/input"
import {
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelHeading,
  PanelTitle,
  PanelDescription,
} from "@/components/ui/panel"
import { PageHeading } from "@/components/ui/section"
import { StatGroup, StatTile } from "@/components/ui/stat-tile"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
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
    cover: string | null
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

  // Branding editor state, re-synced when the server sends fresh org data.
  const [syncedOrg, setSyncedOrg] = React.useState(organization)
  const [brandingName, setBrandingName] = React.useState(organization.name)
  const [brandingDescription, setBrandingDescription] = React.useState(
    organization.description ?? "",
  )
  const [identity, setIdentity] = React.useState<OrgIdentityValue>(() => ({
    logoPreview: organization.logo,
    coverPreview: organization.cover,
    logoFile: null,
    coverFile: null,
  }))

  if (organization !== syncedOrg) {
    setSyncedOrg(organization)
    setBrandingName(organization.name)
    setBrandingDescription(organization.description ?? "")
    setIdentity({
      logoPreview: organization.logo,
      coverPreview: organization.cover,
      logoFile: null,
      coverFile: null,
    })
  }

  const handleSaveBranding = React.useCallback(() => {
    setFeedback(null)
    if (!brandingName.trim()) {
      setFeedback({ tone: "danger", message: "Organization name is required" })
      return
    }

    startTransition(async () => {
      let persisted = { logo: identity.logoPreview, cover: identity.coverPreview }
      if (identity.logoFile || identity.coverFile) {
        try {
          persisted = await persistOrgIdentity(identity)
        } catch (uploadError) {
          setFeedback({
            tone: "danger",
            message:
              uploadError instanceof Error ? uploadError.message : "Failed to upload images",
          })
          return
        }
      }

      const result = await updateOrganization({
        orgId: organization.id,
        name: brandingName.trim(),
        description: brandingDescription.trim(),
        logo: persisted.logo,
        cover: persisted.cover,
      })

      if (!result.success) {
        setFeedback({ tone: "danger", message: result.error })
        return
      }

      setFeedback({ tone: "success", message: "Organization branding updated." })
      router.refresh()
    })
  }, [brandingDescription, brandingName, identity, organization.id, router])

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
    <div className="flex flex-col gap-6 pb-safe-bottom sm:gap-8">
      <PageHeading
        className="animate-rise"
        eyebrow="Organization"
        title={organization.name}
        description={organization.description || "Manage members, invitations, and classes."}
        media={
          <EntityAvatar
            name={organization.name}
            image={organization.logo}
            colorKey={organization.slug}
            shape="square"
            size="lg"
            className="hidden sm:flex"
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={ORG_ROLE_TONES[currentRole]} size="sm" dot>
              {ORG_ROLE_LABELS[currentRole]} access
            </StatusBadge>
            <span className="flex items-center gap-0.5 rounded-md bg-surface-sunken px-2 py-1">
              <span className={typographyVariants({ variant: "mono", tone: "muted" })}>
                /{organization.slug}
              </span>
              <CopyButton value={`${inviteOrigin}/${organization.slug}/dashboard`} label="workspace link" />
            </span>
          </div>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
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
                  <X aria-hidden="true" />
                </Button>
              }
            >
              {feedback.message}
            </Callout>
          ) : null}

          <Tabs defaultValue="people" variant="line">
            <TabsList aria-label="Organization sections">
              <TabsTrigger value="people">
                <Users />
                People
                <TabCount value={members.length} />
              </TabsTrigger>
              <TabsTrigger value="classes">
                <GraduationCap />
                Classes
                <TabCount value={classes.length} />
              </TabsTrigger>
              <TabsTrigger value="invitations">
                <MailPlus />
                Invitations
                <TabCount value={invitations.length} />
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings2 />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="people" className="flex flex-col gap-3">
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

            <TabsContent value="classes" className="flex flex-col gap-3">
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

            <TabsContent value="invitations" className="flex flex-col gap-3">
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

            <TabsContent value="settings">
              <Panel padding="none">
                <PanelHeader>
                  <PanelHeading>
                    <PanelTitle>Organization profile</PanelTitle>
                    <PanelDescription>
                      Name, description, and the images members see across UpClass.
                    </PanelDescription>
                  </PanelHeading>
                </PanelHeader>
                <PanelBody className="flex flex-col gap-6">
                  <OrgIdentityFields
                    value={identity}
                    onChange={setIdentity}
                    name={brandingName}
                    disabled={pending}
                    onError={(message) => setFeedback({ tone: "danger", message })}
                  />

                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="org-settings-name">Organization name</FieldLabel>
                      <Input
                        id="org-settings-name"
                        value={brandingName}
                        maxLength={80}
                        required
                        disabled={pending}
                        onChange={(event) => setBrandingName(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor="org-settings-description"
                        optional
                        hint={`${brandingDescription.length}/200`}
                      >
                        Description
                      </FieldLabel>
                      <Textarea
                        id="org-settings-description"
                        value={brandingDescription}
                        maxLength={200}
                        rows={3}
                        disabled={pending}
                        onChange={(event) => setBrandingDescription(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="org-settings-url">Workspace URL</FieldLabel>
                      <Input id="org-settings-url" value={`/${organization.slug}`} disabled readOnly />
                      <FieldHelp>The workspace URL cannot be changed.</FieldHelp>
                    </Field>
                  </FieldGroup>
                </PanelBody>
                <PanelFooter className="sm:justify-end">
                  <Button
                    type="button"
                    onClick={handleSaveBranding}
                    isLoading={pending}
                    disabled={!brandingName.trim()}
                  >
                    Save changes
                  </Button>
                </PanelFooter>
              </Panel>
            </TabsContent>
          </Tabs>
        </div>

        <aside
          aria-labelledby="invite-people-title"
          className="lg:sticky lg:top-[calc(var(--app-header-height)+1.25rem)]"
        >
          <Panel padding="none" className="overflow-hidden">
            <PanelHeader className="border-b border-hairline px-4 py-3.5">
              <PanelHeading>
                <Text variant="overline" tone="muted">
                  Get started
                </Text>
                <PanelTitle id="invite-people-title" className="mt-1">
                  Invite people
                </PanelTitle>
                <PanelDescription>Invitation links expire after seven days.</PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <PanelBody className="p-4">
              <OrgInviteForm currentRole={currentRole} pending={pending} onSubmit={handleInvite} />
            </PanelBody>
          </Panel>
        </aside>
      </div>

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
    </div>
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
