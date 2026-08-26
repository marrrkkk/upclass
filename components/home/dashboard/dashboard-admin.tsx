"use client"

import Link from "next/link"
import { ArrowRight, Building2, Mail, Settings, Users } from "lucide-react"
import { IconBadge } from "@/components/ui/icon-badge"
import { SectionHeader } from "@/components/ui/section"
import { Text } from "@/components/ui/typography"
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
 * Greeting header, operational stat cluster, a 2-column responsive grid
 * with attention queue & quick actions on the left, and AI assistant + activity on the right rail.
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

      {/* 2-column grid: primary work column + rail */}
      <DashboardGrid variant="primary-rail">
        {/* Primary work column */}
        <div className="space-y-6 sm:space-y-8">
          {/* Admin attention queue */}
          {viewModel.attention.length > 0 && (
            <DashboardAttentionQueue
              role="admin"
              items={viewModel.attention}
              orgSlug={viewModel.orgSlug}
              viewAllHref={`/${viewModel.orgSlug}/admin/classes`}
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
 * Operational stat cards with icon, label, value, and hint.
 */
function AdminOperationsRail({ operations, orgSlug }: AdminOperationsRailProps) {
  const statCards = [
    {
      label: "People",
      value: operations.membersCount,
      hint: "Active members",
      href: `/${orgSlug}/admin/people`,
      icon: Users,
    },
    {
      label: "Classes",
      value: operations.classesCount,
      hint: "Active workspaces",
      href: `/${orgSlug}/classes`,
      icon: Building2,
    },
    {
      label: "Pending invites",
      value: operations.pendingInvitationsCount,
      hint: operations.pendingInvitationsCount > 0 ? "Awaiting response" : "All accepted",
      href: `/${orgSlug}/admin/people?tab=invitations`,
      icon: Mail,
    },
  ]

  return (
    <DashboardSection>
      <div className="grid gap-3 sm:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="touch-target focus-ring group flex min-w-0 items-center gap-4 rounded-[var(--radius-container)] border border-hairline bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline/80 hover:bg-surface-subtle/50 hover:shadow-e1 sm:p-5"
            >
              <IconBadge tone="primary" size="lg" variant="soft">
                <Icon className="size-5" />
              </IconBadge>
              <div className="min-w-0 space-y-0.5">
                <span className="type-caption block truncate font-medium text-foreground-muted">
                  {stat.label}
                </span>
                <div className="type-h1 numeric-tabular leading-tight tracking-tight text-foreground">
                  {stat.value}
                </div>
                <span className="type-caption block truncate text-foreground-secondary">
                  {stat.hint}
                </span>
              </div>
            </Link>
          )
        })}
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
