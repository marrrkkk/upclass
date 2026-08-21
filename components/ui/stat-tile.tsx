import * as React from "react"

import { cn } from "@/lib/utils"
import { statusDotVariants, typographyVariants, type Tone } from "@/lib/design-system"

type StatTileProps = Omit<React.ComponentProps<"div">, "children"> & {
  label: string
  value: React.ReactNode
  /** Short qualifier under the value, e.g. "3 admins". */
  hint?: React.ReactNode
  /** Accent for the label dot. Keep the accent on meaning, not decoration. */
  tone?: Tone
}

/**
 * Compact metric readout, designed to sit inside a `StatGroup`.
 *
 * Deliberately restrained: no icon badge, no per-tile shadow. A row of these
 * reads as one instrument cluster rather than four competing cards, which is
 * most of what keeps a dashboard from looking like a template.
 */
function StatTile({ label, value, hint, tone = "neutral", className, ...props }: StatTileProps) {
  return (
    <div
      data-slot="stat-tile"
      className={cn("flex flex-col gap-1 rounded-[var(--radius-cards)] border border-hairline bg-card px-3 py-2.5", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className={statusDotVariants({ tone, size: "sm" })} aria-hidden="true" />
        <span className={typographyVariants({ variant: "overline", tone: "muted" })}>{label}</span>
      </div>
      <span className={cn(typographyVariants({ variant: "h1" }), "numeric-tabular")}>{value}</span>
      {hint ? (
        <span className={typographyVariants({ variant: "caption", tone: "subtle" })}>{hint}</span>
      ) : null}
    </div>
  )
}

type StatGroupProps = React.ComponentProps<"div"> & {
  /** Tiles per row at the largest breakpoint. */
  columns?: 2 | 3 | 4
}

const columnClasses: Record<NonNullable<StatGroupProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
}

/**
 * Groups `StatTile`s into one bordered cluster.
 *
 * The `gap-px` over a hairline background renders pixel-perfect dividers at any
 * column count, without the off-by-one edges that per-tile borders produce when
 * the grid wraps.
 */
function StatGroup({ className, columns = 4, ...props }: StatGroupProps) {
  return (
    <div
      data-slot="stat-group"
      className={cn(
        "grid grid-cols-1 gap-3 overflow-visible bg-transparent",
        columnClasses[columns],
        className,
      )}
      {...props}
    />
  )
}

export { StatTile, StatGroup }
