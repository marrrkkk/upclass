import Link from "next/link"
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel, PanelBody } from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import type { DashboardRole } from "./dashboard-types"

type DashboardAiCueProps = {
  role: DashboardRole
  orgSlug: string
  queueCount?: number
  classCount?: number
}

/**
 * Contextual AI assistant entry point with role-aware prompts.
 * Designed as a high-visibility, lightweight command card.
 */
export function DashboardAiCue({ role, orgSlug, queueCount = 0, classCount = 0 }: DashboardAiCueProps) {
  const prompts = {
    admin: [
      "Summarize organization",
      "Review pending invitations",
      "Brief me on recent changes",
    ],
    teacher: [
      queueCount > 0 ? "Summarize what needs grading" : "Brief me on my classes",
      "Find classes with overdue work",
      "Show student participation patterns",
    ],
    student: [
      queueCount > 0 ? "Explain what I need to finish" : "Show my upcoming work",
      "Help me plan my due work",
      "Summarize feedback I received",
    ],
  }

  const suggestedPrompts = prompts[role]

  return (
    <Panel className="relative overflow-hidden border-primary/20 bg-gradient-to-b from-primary-surface/30 via-card to-card">
      <PanelBody className="space-y-3.5">
        <div className="flex items-start gap-3">
          <IconBadge tone="primary" size="md" variant="soft" className="shadow-2xs">
            <Sparkles className="size-4" />
          </IconBadge>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <Text variant="h4" className="font-semibold">Ask your assistant</Text>
              <span className="flex size-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            </div>
            <Text variant="small" tone="muted">
              {role === "admin"
                ? "Get briefings on organization operations."
                : role === "teacher"
                  ? "Get briefings on your teaching queue."
                  : "Get help planning your work."}
            </Text>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {suggestedPrompts.slice(0, 3).map((prompt) => (
            <Link
              key={prompt}
              href={`/${orgSlug}/chat?prompt=${encodeURIComponent(prompt)}`}
              className="touch-target focus-ring group flex min-w-0 items-center justify-between gap-2.5 rounded-xl border border-hairline/80 bg-surface/70 px-3.5 py-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-hover hover:shadow-2xs"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <MessageSquare className="size-3.5 shrink-0 text-primary-text" />
                <span className="type-small min-w-0 truncate font-medium text-foreground group-hover:text-primary-text">
                  {prompt}
                </span>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-foreground-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          ))}
        </div>
      </PanelBody>
    </Panel>
  )
}

