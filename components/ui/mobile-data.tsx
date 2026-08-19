import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Mobile data primitives. Desktop keeps semantic `<table>` markup via
 * `DataTable`; these primitives render the touch-friendly card/list
 * representation that replaces hidden columns on phones. Each feature
 * explicitly composes its mobile row, so nothing depends on hiding cells.
 *
 * Rows use accessible text labels (the `label` in `MobileDataField`), so
 * information that lost its table header still reads correctly.
 */

type MobileDataListProps = React.ComponentProps<"ul"> & {
  /** `aria-label` for the list, e.g. "Organization members". */
  label: string
}

function MobileDataList({ label, className, children, ...props }: MobileDataListProps) {
  return (
    <ul
      data-slot="mobile-data-list"
      aria-label={label}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {children}
    </ul>
  )
}

type MobileDataRowProps = React.ComponentProps<"li"> & {
  interactive?: boolean
}

function MobileDataRow({
  interactive = false,
  className,
  children,
  ...props
}: MobileDataRowProps) {
  return (
    <li
      data-slot="mobile-data-row"
      data-interactive={interactive ? "true" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl border border-hairline bg-card p-3",
        interactive && "row-interactive cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </li>
  )
}

type MobileDataFieldProps = {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
}

/** Labeled value pair for fields that lost their table header on mobile. */
function MobileDataField({ label, value, className }: MobileDataFieldProps) {
  return (
    <div data-slot="mobile-data-field" className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="type-caption font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate type-small text-foreground">{value}</span>
    </div>
  )
}

type MobileDataActionsProps = React.ComponentProps<"div">

/** Touch-safe action cluster, right-aligned and never wrapping into text. */
function MobileDataActions({ className, children, ...props }: MobileDataActionsProps) {
  return (
    <div
      data-slot="mobile-data-actions"
      className={cn("ml-auto flex shrink-0 items-center gap-1.5", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { MobileDataList, MobileDataRow, MobileDataField, MobileDataActions }