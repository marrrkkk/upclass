import { CheckCircle2, type LucideIcon } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { Text } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

type DashboardEmptyStateProps = {
  icon?: LucideIcon
  title: string
  description: string
  tone?: "success" | "neutral" | "info"
  action?: React.ReactNode
  compact?: boolean
}

/**
 * Truthful empty state for dashboard sections.
 * Use the compact variant for inline empty queue states.
 */
export function DashboardEmptyState({
  icon: Icon = CheckCircle2,
  title,
  description,
  tone = "success",
  action,
  compact = false,
}: DashboardEmptyStateProps) {
  if (compact) {
    const toneClasses = {
      success: "text-success-text",
      neutral: "text-foreground-secondary",
      info: "text-primary-text",
    }

    return (
      <div className="flex items-center gap-3 px-4 py-4 sm:py-5">
        <Icon aria-hidden="true" className={cn("size-5 shrink-0", toneClasses[tone])} />
        <div>
          <Text variant="h4">{title}</Text>
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        </div>
      </div>
    )
  }

  const emptyTone = tone === "success" ? "success" : tone === "info" ? "primary" : "neutral"

  return (
    <EmptyState
      icon={<Icon />}
      title={title}
      description={description}
      tone={emptyTone}
      action={action}
    />
  )
}
