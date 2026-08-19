import { cn } from "@/lib/utils"
import type { TeacherMetric } from "./dashboard-types"

type DashboardMetricStripProps = {
  metrics: TeacherMetric[]
}

/**
 * Modern structured metric cards for role-specific pulse data.
 * Only renders metrics marked as visible (suppresses zero-value metrics).
 */
export function DashboardMetricStrip({ metrics }: DashboardMetricStripProps) {
  const visibleMetrics = metrics.filter((m) => m.visible)
  
  if (visibleMetrics.length === 0) {
    return null
  }

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {visibleMetrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col justify-between gap-1 rounded-[var(--radius-container)] border border-hairline bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline/80 hover:bg-surface-subtle/50 hover:shadow-2xs sm:p-4"
        >
          <dt className="type-caption font-medium text-foreground-muted">{metric.label}</dt>
          <dd className="type-h1 numeric-tabular tracking-tight text-foreground">{metric.value}</dd>
        </div>
      ))}
    </dl>
  )
}

