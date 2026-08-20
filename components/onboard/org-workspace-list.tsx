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

/** The workspace launcher: one scannable directory, with two clear next steps. */
export function OrgWorkspaceList({ organizations, greetingName, onCreate, onJoin }: OrgWorkspaceListProps) {
  const firstName = greetingName?.trim().split(/\s+/)[0]
  const hasOrganizations = organizations.length > 0

  return (
    <div className="org-hub space-y-8 sm:space-y-10">
      <header className="org-hub-hero animate-rise">
        <div className="org-hub-kicker"><span className="org-hub-kicker-mark" aria-hidden="true" />Workspace directory<span className="org-hub-kicker-count">{organizations.length} {organizations.length === 1 ? "workspace" : "workspaces"}</span></div>
        <Text variant="display" as="h1" className="mt-4 max-w-3xl text-balance">{firstName ? `Welcome back, ${firstName}` : "Choose a workspace"}</Text>
        <Text variant="bodyLg" tone="muted" className="mt-3 max-w-2xl text-pretty leading-relaxed">{hasOrganizations ? "Open a workspace to continue with your classes, people, and resources." : "Create a workspace for your school, or use an invite code to join one that already exists."}</Text>
      </header>

      <div className="org-hub-grid grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
        <section aria-labelledby="workspace-list-title">
          <Panel padding="none" className="org-hub-directory overflow-hidden">
            <div className="org-hub-directory-header flex min-h-16 items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="min-w-0"><Text id="workspace-list-title" variant="h3" as="h2">Your workspaces</Text><Text variant="caption" tone="subtle" className="mt-1 block">{hasOrganizations ? "Ready to open" : "Nothing here yet"}</Text></div>
              <IconBadge tone="primary" size="sm" aria-hidden="true"><Building2 /></IconBadge>
            </div>
            {hasOrganizations ? <div className="divide-y divide-hairline">{organizations.map((organization, index) => <Link key={organization.id} href={`/${organization.slug}/dashboard`} style={staggerDelay(index)} className={cn("group focus-ring org-hub-workspace-row animate-rise flex min-h-24 items-center gap-4 px-5 py-4 sm:px-6", motion.colors)}><EntityAvatar name={organization.name} image={organization.logo ?? undefined} colorKey={organization.slug} shape="square" size="lg" /><span className="min-w-0 flex-1"><span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1"><span className={cn(typographyVariants({ variant: "h4" }), "truncate font-semibold")}>{organization.name}</span><StatusBadge tone={ORG_ROLE_TONES[organization.role]} size="sm">{ORG_ROLE_LABELS[organization.role]}</StatusBadge></span><span className={cn(typographyVariants({ variant: "small", tone: "muted" }), "mt-1 block truncate")}>{organization.description || `/${organization.slug}`}</span><span className={cn(typographyVariants({ variant: "caption", tone: "subtle" }), "mt-1.5 inline-flex items-center gap-1.5")}><Users aria-hidden="true" />{organization.memberCount} {organization.memberCount === 1 ? "member" : "members"}</span></span><span className="org-hub-open hidden items-center gap-1.5 sm:inline-flex">Open <ArrowRight aria-hidden="true" /></span></Link>)}</div> : <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"><IconBadge tone="primary" size="lg"><Building2 aria-hidden="true" /></IconBadge><Text variant="h3" className="mt-4">No workspace yet</Text><Text variant="small" tone="muted" className="mt-2 max-w-sm text-pretty leading-relaxed">Workspaces keep classes, rosters, and resources together. Start one or join with an invite.</Text><div className="mt-6 flex flex-wrap justify-center gap-3"><Button size="sm" onClick={onCreate}><Plus aria-hidden="true" />Create workspace</Button><Button variant="outline" size="sm" onClick={onJoin}><KeyRound aria-hidden="true" />Join with invite</Button></div></div>}
          </Panel>
        </section>
        <aside aria-labelledby="workspace-actions-title" className="org-hub-actions"><Text variant="overline" tone="primary">Get started</Text><Text id="workspace-actions-title" variant="h3" as="h2" className="mt-1">Where are you headed?</Text><Text variant="small" tone="muted" className="mt-2 leading-relaxed">Choose the path that matches your next move.</Text><div className="mt-5 flex flex-col gap-2"><WorkspaceAction icon={<Plus />} title="Create organization" description="Start a new school workspace." onClick={onCreate} /><WorkspaceAction icon={<KeyRound />} title="Join with a code" description="Use an invitation you received." onClick={onJoin} tone="info" /></div></aside>
      </div>
    </div>
  )
}

function WorkspaceAction({ icon, title, description, tone = "primary", onClick }: { icon: React.ReactNode; title: string; description: string; tone?: "primary" | "info"; onClick: () => void }) {
  return <Button type="button" variant="ghost" onClick={onClick} className="org-hub-action group h-auto min-h-20 w-full justify-start gap-3 whitespace-normal rounded-lg px-3 py-3 text-left"><IconBadge tone={tone} size="md">{icon}</IconBadge><span className="min-w-0 flex-1"><span className="block type-small font-semibold">{title}</span><span className="mt-0.5 block type-caption text-muted-foreground">{description}</span></span><ArrowRight aria-hidden="true" /></Button>
}




