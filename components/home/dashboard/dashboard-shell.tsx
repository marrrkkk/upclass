import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type DashboardShellProps = {
  children: ReactNode
  className?: string
}

/**
 * Shared outer frame for all dashboard role views.
 * Provides consistent spacing and responsive layout behavior.
 */
export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className={cn("space-y-6 pb-safe-bottom pb-10 sm:space-y-8 lg:space-y-10", className)}>
      {children}
    </div>
  )
}

type DashboardSectionProps = {
  children: ReactNode
  className?: string
}

/**
 * Wrapper for a dashboard section with consistent spacing.
 */
export function DashboardSection({ children, className }: DashboardSectionProps) {
  return (
    <section className={cn("space-y-3 sm:space-y-4", className)}>
      {children}
    </section>
  )
}

type DashboardGridProps = {
  children: ReactNode
  variant?: "default" | "primary-rail" | "equal"
  className?: string
}

/**
 * Responsive grid layout for dashboard content.
 * - default: basic gap grid
 * - primary-rail: dominant left column + narrower right rail (desktop)
 * - equal: equal columns on desktop
 */
export function DashboardGrid({ children, variant = "default", className }: DashboardGridProps) {
  const variantClasses = {
    default: "grid gap-4 sm:gap-5",
    "primary-rail": "grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]",
    equal: "grid gap-4 sm:gap-5 md:grid-cols-2",
  }

  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  )
}
