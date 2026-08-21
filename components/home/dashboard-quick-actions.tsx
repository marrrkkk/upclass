"use client"

import Link from "next/link"
import {
  CalendarDays,
  ClipboardCheck,
  FolderOpen,
  Megaphone,
  MessageSquareText,
  PenLine,
  Send,
  type LucideIcon,
} from "lucide-react"

import { IconBadge } from "@/components/ui/icon-badge"
import { Text } from "@/components/ui/typography"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import type { Tone } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type DashboardQuickActionsProps = {
  role: "teacher" | "student" | null
}

type QuickAction = {
  label: string
  description: string
  href: string
  icon: LucideIcon
  tone: Tone
}

const teacherActions: QuickAction[] = [
  {
    label: "Create assignment",
    description: "Add coursework to a class",
    href: "/classes",
    icon: PenLine,
    tone: "primary",
  },
  {
    label: "Post announcement",
    description: "Share an update with a class",
    href: "/classes",
    icon: Megaphone,
    tone: "info",
  },
  {
    label: "Grade submissions",
    description: "Work that is ready for feedback",
    href: "/dashboard#review-queue",
    icon: ClipboardCheck,
    tone: "success",
  },
  {
    label: "View calendar",
    description: "Deadlines across your classes",
    href: "/calendar",
    icon: CalendarDays,
    tone: "warning",
  },
]

const studentActions: QuickAction[] = [
  {
    label: "View calendar",
    description: "Everything due, at a glance",
    href: "/calendar",
    icon: CalendarDays,
    tone: "primary",
  },
  {
    label: "Submit work",
    description: "Continue or hand in coursework",
    href: "/classes",
    icon: Send,
    tone: "info",
  },
  {
    label: "Message teacher",
    description: "Ask a question in a conversation",
    href: "/messages",
    icon: MessageSquareText,
    tone: "success",
  },
  {
    label: "Browse resources",
    description: "Review course material and files",
    href: "/resources",
    icon: FolderOpen,
    tone: "warning",
  },
]

export function DashboardQuickActions({ role }: DashboardQuickActionsProps) {
  const organizationPath = useOrganizationPath()
  const actions = role === "teacher" ? teacherActions : studentActions

  return (
    <nav aria-labelledby="dashboard-quick-actions-title">
      <Text as="h2" id="dashboard-quick-actions-title" variant="overline" tone="primary" className="mb-2.5 block font-semibold">
        Quick actions
      </Text>
      <ul className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <li key={action.label} className="min-w-0">
              <Link
                href={organizationPath(action.href)}
                className={cn(
                  "touch-target group focus-ring flex h-full items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3",
                  "transition-all duration-200 ease-out-expo hover:border-hairline-strong hover:bg-surface hover:shadow-e2",
                )}
              >
                <IconBadge tone={action.tone} size="sm" variant="soft" className="shrink-0 transition-transform duration-200 group-hover:scale-105">
                  <Icon aria-hidden="true" />
                </IconBadge>
                <span className="min-w-0 flex-1">
                  <Text variant="small" className="block truncate font-medium transition-colors group-hover:text-primary-strong">
                    {action.label}
                  </Text>
                  <Text variant="caption" tone="muted" truncate className="hidden sm:block">
                    {action.description}
                  </Text>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
