import * as React from "react"

import { cn } from "@/lib/utils"

type ResponsiveSplitViewProps = React.ComponentProps<"div"> & {
  list: React.ReactNode
  detail?: React.ReactNode
  emptyDetail?: React.ReactNode
  listLabel: string
  detailLabel: string
}

/**
 * Master/detail workspace: one pane on phones, persistent split view from the
 * tablet breakpoint without changing the route model.
 */
function ResponsiveSplitView({
  list,
  detail,
  emptyDetail,
  listLabel,
  detailLabel,
  className,
  ...props
}: ResponsiveSplitViewProps) {
  const hasDetail = detail != null

  return (
    <div
      data-slot="responsive-split-view"
      data-has-detail={hasDetail ? "true" : "false"}
      className={cn(
        "grid min-h-[34rem] min-w-0 overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]",
        className,
      )}
      {...props}
    >
      <section
        aria-label={listLabel}
        className={cn(
          "min-w-0 overflow-y-auto bg-surface-subtle/30 md:block md:border-r md:border-hairline/70",
          hasDetail ? "hidden" : "block",
        )}
      >
        {list}
      </section>
      <section
        aria-label={detailLabel}
        className={cn("min-w-0 bg-card", hasDetail ? "block" : "hidden md:block")}
      >
        {detail ?? emptyDetail}
      </section>
    </div>
  )
}

export { ResponsiveSplitView }
