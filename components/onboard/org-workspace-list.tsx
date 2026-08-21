"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Building2, KeyRound, Plus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { IconBadge } from "@/components/ui/icon-badge"
import {
  Panel,
  PanelActions,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { PageHeading } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { motion, staggerDelay, typographyVariants } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { ORG_ROLE_LABELS, ORG_ROLE_TONES, type OrganizationSummary } from "@/types/organization"

type OrgWorkspaceListProps = {
  organizations: OrganizationSummary[]
  greetingName?: string | null
  onCreate: () => void
  onJoin: () => void
}

/** Workspace directory: same page rhythm as Classes / Learn / Resources. */
export function OrgWorkspaceList({
  organizations,
  greetingName,
  onCreate,
  onJoin,
}: OrgWorkspaceListProps) {
  const firstName = greetingName?.trim().split(/\s+/)[0]
  const hasOrganizations = organizations.length > 0
  const workspaceLabel = organizations.length === 1 ? "workspace" : "workspaces"

  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 sm:gap-8">
      <PageHeading
        className="animate-rise"
        eyebrow={`Workspace directory · ${organizations.length} ${workspaceLabel}`}
        title={firstName ? `Welcome back, ${firstName}` : "Choose a workspace"}
        description={
          hasOrganizations
            ? "Open a workspace to continue with your classes, people, and resources."
            : "Create a workspace for your school, or use an invite code to join one that already exists."
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-6">
        <section aria-labelledby="workspace-list-title">
          <Panel padding="none" className="overflow-hidden">
            <PanelHeader className="border-b border-hairline bg-surface-sunken/40 px-4 py-3.5 sm:px-5">
              <PanelHeading>
                <PanelTitle id="workspace-list-title">Your workspaces</PanelTitle>
                <PanelDescription>
                  {hasOrganizations ? "Ready to open" : "Nothing here yet"}
                </PanelDescription>
              </PanelHeading>
              <PanelActions>
                <IconBadge tone="primary" size="sm" aria-hidden="true">
                  <Building2 />
                </IconBadge>
              </PanelActions>
            </PanelHeader>

            {hasOrganizations ? (
              <div className="divide-y divide-hairline">
                {organizations.map((organization, index) => (
                  <Link
                    key={organization.id}
                    href={`/${organization.slug}/dashboard`}
                    style={staggerDelay(index)}
                    className={cn(
                      "group focus-ring animate-rise flex min-h-[4.5rem] items-center gap-3.5 px-4 py-3.5 sm:min-h-20 sm:gap-4 sm:px-5",
                      motion.colors,
                      "hover:bg-surface-hover",
                    )}
                  >
                    <EntityAvatar
                      name={organization.name}
                      image={organization.logo ?? undefined}
                      colorKey={organization.slug}
                      shape="square"
                      size="lg"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span
                          className={cn(
                            typographyVariants({ variant: "h4" }),
                            "truncate font-semibold",
                          )}
                        >
                          {organization.name}
                        </span>
                        <StatusBadge tone={ORG_ROLE_TONES[organization.role]} size="sm">
                          {ORG_ROLE_LABELS[organization.role]}
                        </StatusBadge>
                      </span>
                      <span
                        className={cn(
                          typographyVariants({ variant: "small", tone: "muted" }),
                          "mt-1 block truncate",
                        )}
                      >
                        {organization.description || `/${organization.slug}`}
                      </span>
                      <span
                        className={cn(
                          typographyVariants({ variant: "caption", tone: "subtle" }),
                          "mt-1.5 inline-flex items-center gap-1.5",
                        )}
                      >
                        <Users aria-hidden="true" className="size-3.5" />
                        {organization.memberCount}{" "}
                        {organization.memberCount === 1 ? "member" : "members"}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1.5 type-caption font-semibold text-muted-foreground transition-colors group-hover:text-primary-text sm:inline-flex">
                      Open
                      <ArrowRight
                        aria-hidden="true"
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <PanelBody className="p-0">
                <EmptyState
                  icon={<Building2 />}
                  tone="primary"
                  title="No workspace yet"
                  description="Workspaces keep classes, rosters, and resources together. Start one or join with an invite."
                  action={
                    <>
                      <Button size="sm" onClick={onCreate}>
                        <Plus data-icon="inline-start" />
                        Create workspace
                      </Button>
                      <Button variant="outline" size="sm" onClick={onJoin}>
                        <KeyRound data-icon="inline-start" />
                        Join with invite
                      </Button>
                    </>
                  }
                />
              </PanelBody>
            )}
          </Panel>
        </section>

        <aside
          aria-labelledby="workspace-actions-title"
          className="lg:sticky lg:top-[calc(var(--app-header-height)+1.25rem)]"
        >
          <Panel padding="none" className="overflow-hidden">
            <PanelHeader className="border-b border-hairline px-4 py-3.5">
              <PanelHeading>
                <Text variant="overline" tone="muted">
                  Get started
                </Text>
                <PanelTitle id="workspace-actions-title" className="mt-1">
                  Where are you headed?
                </PanelTitle>
                <PanelDescription>
                  Create a school workspace or join with an invite.
                </PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <PanelBody className="flex flex-col gap-1.5 p-2 sm:p-2.5">
              <WorkspaceAction
                icon={<Plus />}
                title="Create organization"
                description="Start a new school workspace."
                onClick={onCreate}
              />
              <WorkspaceAction
                icon={<KeyRound />}
                title="Join with a code"
                description="Use an invitation you received."
                onClick={onJoin}
                tone="info"
              />
            </PanelBody>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function WorkspaceAction({
  icon,
  title,
  description,
  tone = "primary",
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  tone?: "primary" | "info"
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="group h-auto min-h-[3.75rem] w-full justify-start gap-3 whitespace-normal rounded-[var(--radius-control)] px-2.5 py-2.5 text-left hover:bg-surface-hover"
    >
      <IconBadge tone={tone} size="md">
        {icon}
      </IconBadge>
      <span className="min-w-0 flex-1">
        <span className="block type-small font-semibold">{title}</span>
        <span className="mt-0.5 block type-caption text-muted-foreground">{description}</span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Button>
  )
}
