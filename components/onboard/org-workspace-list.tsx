"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Building2, KeyRound, Plus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel } from "@/components/ui/panel"
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

/** A compact, modern workspace directory with creation paths kept in a separate action rail. */
export function OrgWorkspaceList({
  organizations,
  greetingName,
  onCreate,
  onJoin,
}: OrgWorkspaceListProps) {
  const hasOrganizations = organizations.length > 0
  const firstName = greetingName?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="max-w-3xl animate-rise space-y-3.5">
        <div className="inline-flex items-center gap-2">
          <StatusBadge tone="primary" size="sm">
            Workspace directory
          </StatusBadge>
          <span className="text-xs text-muted-foreground hidden sm:inline-flex">
            All your schools in one place
          </span>
        </div>
        <div className="space-y-2">
          <Text variant="display" as="h1" className="max-w-2xl text-balance">
            {firstName ? `Welcome back, ${firstName}` : "Choose a workspace"}
          </Text>
          <Text variant="bodyLg" tone="muted" className="max-w-2xl text-pretty leading-relaxed">
            {hasOrganizations
              ? "Open a school workspace to continue with your classes, people, and resources."
              : "Create a workspace for your school, or use an invite code to join one that already exists."}
          </Text>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        <section aria-labelledby="workspace-list-title">
          <Panel padding="none" className="overflow-hidden border border-hairline bg-card shadow-e1 transition-shadow duration-300 hover:shadow-e2">
            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-hairline bg-surface/60 px-5 py-4 sm:px-6">
              <div className="min-w-0 flex items-center gap-2.5">
                <div>
                  <Text id="workspace-list-title" variant="h3" as="h2" className="font-semibold">
                    Your workspaces
                  </Text>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-success" />
                    <Text variant="caption" tone="subtle">
                      {organizations.length} {organizations.length === 1 ? "place" : "places"} available
                    </Text>
                  </div>
                </div>
              </div>
              <IconBadge tone="primary" size="sm" aria-hidden="true">
                <Building2 />
              </IconBadge>
            </div>

            {hasOrganizations ? (
              <div className="divide-y divide-hairline">
                {organizations.map((organization, index) => (
                  <Link
                    key={organization.id}
                    href={`/${organization.slug}/dashboard`}
                    style={staggerDelay(index)}
                    className={cn(
                      "group focus-ring animate-rise relative flex min-h-24 items-center gap-4 px-5 py-4.5 sm:px-6",
                      "hover:bg-muted/40 transition-all duration-200",
                      motion.colors,
                    )}
                  >
                    <EntityAvatar
                      name={organization.name}
                      image={organization.logo ?? undefined}
                      colorKey={organization.slug}
                      shape="square"
                      size="lg"
                      className="shadow-e1 transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className={cn(typographyVariants({ variant: "h4" }), "truncate font-semibold group-hover:text-primary-strong transition-colors")}>
                          {organization.name}
                        </span>
                        <StatusBadge tone={ORG_ROLE_TONES[organization.role]} size="sm">
                          {ORG_ROLE_LABELS[organization.role]}
                        </StatusBadge>
                      </div>
                      <p
                        className={cn(
                          typographyVariants({ variant: "small", tone: "muted" }),
                          "mt-1 line-clamp-1",
                        )}
                      >
                        {organization.description || `/${organization.slug}`}
                      </p>
                      <span
                        className={cn(
                          typographyVariants({ variant: "caption", tone: "subtle" }),
                          "mt-1.5 inline-flex items-center gap-1.5 font-medium",
                        )}
                      >
                        <Users aria-hidden="true" className="size-3.5 text-muted-foreground/70" />
                        {organization.memberCount} {organization.memberCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <span className="hidden items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-1 text-xs font-semibold text-foreground shadow-2xs transition-all duration-200 group-hover:border-primary-border group-hover:bg-primary group-hover:text-primary-text sm:flex">
                      Open
                      <ArrowRight
                        aria-hidden="true"
                        className="size-3.5 transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                <IconBadge tone="primary" size="lg">
                  <Building2 aria-hidden="true" />
                </IconBadge>
                <Text variant="h3" className="mt-4 font-semibold">
                  Your first workspace starts here
                </Text>
                <Text variant="small" tone="muted" className="mt-1.5 max-w-sm text-pretty leading-relaxed">
                  Workspaces keep classes, rosters, and resources together. Choose an option on the right to begin.
                </Text>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button size="sm" onClick={onCreate}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    Create workspace
                  </Button>
                  <Button variant="outline" size="sm" onClick={onJoin}>
                    <KeyRound className="size-3.5" aria-hidden="true" />
                    Join with code
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        </section>

        <aside aria-labelledby="workspace-actions-title" className="lg:sticky lg:top-24">
          <Panel padding="none" className="overflow-hidden border border-hairline bg-card shadow-e1">
            <div className="border-b border-hairline bg-primary-surface/60 px-5 py-4">
              <Text variant="overline" tone="primary" className="font-semibold">
                Add a workspace
              </Text>
              <Text id="workspace-actions-title" variant="h3" as="h2" className="mt-0.5 font-semibold">
                Where are you headed?
              </Text>
            </div>
            <div className="p-2.5 space-y-1">
              <WorkspaceAction
                icon={<Plus aria-hidden="true" />}
                title="Create organization"
                description="Start a new school workspace."
                onClick={onCreate}
              />
              <div className="mx-3 border-t border-hairline/60" />
              <WorkspaceAction
                icon={<KeyRound aria-hidden="true" />}
                title="Join with a code"
                description="Use an invitation you received."
                onClick={onJoin}
                tone="info"
              />
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

type WorkspaceActionProps = {
  icon: React.ReactNode
  title: string
  description: string
  tone?: "primary" | "info"
  onClick: () => void
}

function WorkspaceAction({ icon, title, description, tone = "primary", onClick }: WorkspaceActionProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="group h-auto min-h-20 w-full justify-start gap-3.5 whitespace-normal rounded-xl px-3.5 py-3 text-left transition-all duration-200 hover:bg-surface"
    >
      <IconBadge tone={tone} size="md" className="transition-transform duration-200 group-hover:scale-105">
        {icon}
      </IconBadge>
      <span className="min-w-0 flex-1">
        <span className="block type-small font-semibold text-foreground group-hover:text-primary-strong transition-colors">
          {title}
        </span>
        <span className="mt-0.5 block type-caption font-normal text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="size-4 text-muted-foreground/60 transition-all duration-200 ease-out-expo group-hover:translate-x-1 group-hover:text-primary-strong"
      />
    </Button>
  )
}


