"use client"

import Link from "next/link"
import { ArrowRight, Building2, CheckCircle2, Mail, Settings, ShieldAlert, Users } from "lucide-react"
import { CourseSwatch } from "@/components/ui/course-identity"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel, PanelBody } from "@/components/ui/panel"
import { SectionHeader } from "@/components/ui/section"
import { Text } from "@/components/ui/typography"
import { statusDotVariants } from "@/lib/design-system"
import type { AdminDashboardViewModel } from "./dashboard-types"
import { DashboardShell, DashboardSection, DashboardGrid } from "./dashboard-shell"
import { DashboardHeader } from "./dashboard-header"
import { DashboardAttentionQueue } from "./dashboard-attention-queue"
import { DashboardActivity } from "./dashboard-activity"
import { DashboardAiCue } from "./dashboard-ai-cue"

type DashboardAdminProps = {
  viewModel: AdminDashboardViewModel
  userName: string
}

/**
 * Admin-specific dashboard composition.
 * Features an operational overview cluster, a 2-column responsive Bento grid
 * with work queue & quick actions on the left, and AI assistant + activity stream on the right rail.
 */
export function DashboardAdmin({ viewModel, userName }: DashboardAdminProps) {
  return (
    <DashboardShell>
      <DashboardHeader header={viewModel.header} userName={userName} />

      {/* Organization operational metrics cluster */}
      <AdminOperationsRail
        operations={viewModel.operations}
        orgSlug={viewModel.orgSlug}
      />

      {/* 2-column Bento Grid: primary work column + rail */}
      <DashboardGrid variant="primary-rail">
        {/* Primary work column */}
        <div className="space-y-6 sm:space-y-8">
          {/* Admin attention queue */}
          {viewModel.attention.length > 0 && (
            <DashboardAttentionQueue
              role="admin"
              items={viewModel.attention}
              orgSlug={viewModel.orgSlug}
            />
          )}

          {/* Admin workspace shortcuts */}
          <AdminWorkspaceShortcuts
            workspace={viewModel.workspace}
            orgSlug={viewModel.orgSlug}
          />
        </div>

        {/* Intelligence & activity rail */}
        <div className="space-y-6 sm:space-y-8">
          {/* AI assistant command cue */}
          <DashboardAiCue
            role="admin"
            orgSlug={viewModel.orgSlug}
            queueCount={viewModel.attention.length}
          />

          {/* Recent organization activity stream */}
          <DashboardActivity
            activity={viewModel.activity}
            orgSlug={viewModel.orgSlug}
            role="admin"
          />
        </div>
      </DashboardGrid>
    </DashboardShell>
  )
}

type AdminOperationsRailProps = {
  operations: AdminDashboardViewModel["operations"]
  orgSlug: string
}

/**
 * Elevated operational stat cluster with interactive cards and health status indicator.
 */
function AdminOperationsRail({ operations, orgSlug }: AdminOperationsRailProps) {
  const statCards = [
    {
      label: "People",
      value: operations.membersCount,
      hint: "Active members",
      href: `/${orgSlug}/admin/people`,
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Classes",
      value: operations.classesCount,
      hint: "Active workspaces",
      href: `/${orgSlug}/classes`,
      icon: Building2,
      tone: "info" as const,
    },
    {
      label: "Pending invites",
      value: operations.pendingInvitationsCount,
      hint: operations.pendingInvitationsCount > 0 ? "Awaiting response" : "All accepted",
      href: `/${orgSlug}/admin/people?tab=invitations`,
      icon: Mail,
      tone: operations.pendingInvitationsCount > 0 ? ("warning" as const) : ("neutral" as const),
    },
  ]

  const hasIssues = operations.pendingInvitationsCount > 0

  return (
    <DashboardSection>
      <SectionHeader
        title="Organization overview"
        description="Current operational state and health."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="touch-target focus-ring group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline/80 hover:bg-surface-subtle/50 hover:shadow-e1 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <IconBadge tone={stat.tone} size="md" variant="soft">
                  <Icon className="size-4" />
                </IconBadge>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 text-foreground-muted opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </div>

              <div className="mt-3 space-y-0.5">
                <span className="type-caption font-medium text-foreground-muted">{stat.label}</span>
                <div className="type-h1 numeric-tabular tracking-tight text-foreground">{stat.value}</div>
                <span className="type-caption text-foreground-secondary">{stat.hint}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Operational status banner */}
      <div className="flex items-center gap-2.5 rounded-[var(--radius-container)] border border-hairline bg-surface-subtle/40 px-4 py-2.5 sm:px-5">
        <span
          className={statusDotVariants({
            tone: hasIssues ? "warning" : "success",
            size: "sm",
            ring: true,
          })}
          aria-hidden="true"
        />
        <Text variant="small" tone="muted" className="flex-1">
          {operations.statusMessage}
        </Text>
      </div>
    </DashboardSection>
  )
}

type AdminWorkspaceShortcutsProps = {
  workspace: AdminDashboardViewModel["workspace"]
  orgSlug: string
}

/**
 * Interactive quick action cards for administrative workflows.
 */
function AdminWorkspaceShortcuts({ workspace }: AdminWorkspaceShortcutsProps) {
  const iconConfig: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; tone: "primary" | "info" | "warning" | "neutral"; description: string }
  > = {
    users: { icon: Users, tone: "primary", description: "View directory & roles" },
    building: { icon: Building2, tone: "info", description: "Manage class workspaces" },
    mail: { icon: Mail, tone: "warning", description: "Review & send invites" },
    settings: { icon: Settings, tone: "neutral", description: "Configure organization" },
  }

  return (
    <DashboardSection>
      <SectionHeader title="Quick actions" description="Common administrative tasks." />
      <div className="grid gap-3 sm:grid-cols-2">
        {workspace.shortcuts.map((shortcut) => {
          const config = iconConfig[shortcut.icon] || { icon: Building2, tone: "primary" as const, description: "Manage workspace" }
          const Icon = config.icon

          return (
            <Link
              key={shortcut.label}
              href={shortcut.href}
              className="touch-target focus-ring group flex min-w-0 items-center gap-3.5 rounded-[var(--radius-container)] border border-hairline bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline/80 hover:bg-surface-subtle/60 hover:shadow-e1 sm:p-4"
            >
              <IconBadge tone={config.tone} size="md" variant="soft">
                <Icon className="size-4" />
              </IconBadge>
              <div className="min-w-0 flex-1 space-y-0.5">
                <Text
                  as="span"
                  variant="h4"
                  className="block truncate font-semibold text-foreground group-hover:text-primary-text"
                >
                  {shortcut.label}
                </Text>
                <Text as="span" variant="caption" tone="muted" className="block truncate">
                  {config.description}
                </Text>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-foreground-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          )
        })}
      </div>
    </DashboardSection>
  )
}

