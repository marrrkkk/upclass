import Link from "next/link"
import { ArrowRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/typography"
import type { DashboardHeaderModel } from "./dashboard-types"
import { firstName } from "./dashboard-formatters"

type DashboardHeaderProps = {
  header: DashboardHeaderModel
  userName: string
}

/**
 * Shared dashboard page header with title, subtitle, date badge, and primary action.
 * Responsive layout: stacks on mobile, horizontal on tablet+.
 */
export function DashboardHeader({ header, userName }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-hairline/80 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-6">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-1.5 text-foreground-muted">
          <Calendar className="size-3.5" aria-hidden="true" />
          <Text variant="caption" tone="muted" className="font-medium">
            {header.dateLabel}
          </Text>
        </div>
        <Text as="h1" variant="display" className="text-balance font-bold tracking-tight text-foreground">
          {header.title}, {firstName(userName)}
        </Text>
        <Text variant="body" tone="muted" className="max-w-2xl text-pretty">
          {header.subtitle}
        </Text>
      </div>
      <Button asChild size="default" className="w-full shrink-0 shadow-2xs sm:w-auto">
        <Link href={header.primaryAction.href}>
          {header.primaryAction.label}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </Button>
    </header>
  )
}

