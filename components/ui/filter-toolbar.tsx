import * as React from "react"

import { cn } from "@/lib/utils"

type FilterToolbarProps = React.ComponentProps<"div"> & {
  label: string
  filters: React.ReactNode
  actions?: React.ReactNode
  summary?: React.ReactNode
}

/** Compact search/filter/action strip shared by collection pages. */
function FilterToolbar({
  label,
  filters,
  actions,
  summary,
  className,
  ...props
}: FilterToolbarProps) {
  return (
    <div
      data-slot="filter-toolbar"
      role="search"
      aria-label={label}
      className={cn(
        "flex flex-col gap-2 border-b border-hairline pb-3 lg:flex-row lg:items-center",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {filters}
      </div>
      {summary ? <div className="type-caption text-muted-foreground lg:ml-auto">{summary}</div> : null}
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export { FilterToolbar }
