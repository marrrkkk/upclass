import * as React from "react"

import { cn } from "@/lib/utils"
import { panelVariants, typographyVariants, type PanelVariantProps } from "@/lib/design-system"

type PanelProps = React.ComponentProps<"div"> & PanelVariantProps

/**
 * Container surface for grouped content. Prefer `Panel` over `Card` for new
 * work: it uses hairline borders, no shadows on content, and padding is a
 * variant instead of a per-instance class.
 *
 * ```tsx
 * <Panel padding="none">
 *   <PanelHeader>
 *     <PanelTitle>People</PanelTitle>
 *     <PanelActions><Button size="sm">Invite</Button></PanelActions>
 *   </PanelHeader>
 *   <PanelBody>…</PanelBody>
 * </Panel>
 * ```
 */
function Panel({ className, variant, padding, interactive, ...props }: PanelProps) {
  return (
    <div
      data-slot="panel"
      className={cn(panelVariants({ variant, padding, interactive }), className)}
      {...props}
    />
  )
}

/** Header strip: title block on the left, actions on the right. */
function PanelHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "flex flex-col gap-2 px-3.5 pb-2.5 pt-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
        className,
      )}
      {...props}
    />
  )
}

function PanelHeading({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="panel-heading" className={cn("min-w-0 space-y-1", className)} {...props} />
  )
}

function PanelTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="panel-title"
      className={cn(typographyVariants({ variant: "h3" }), "flex items-center gap-2", className)}
      {...props}
    />
  )
}

function PanelDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="panel-description"
      className={cn(typographyVariants({ variant: "small", tone: "muted" }), className)}
      {...props}
    />
  )
}

/** Right-aligned actions in a `PanelHeader`. */
function PanelActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-actions"
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  )
}

function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="panel-body" className={cn("p-4", className)} {...props} />
}

function PanelFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-footer"
      className={cn(
        "flex flex-col gap-2.5 rounded-b-[var(--radius-container)] bg-surface-sunken/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    />
  )
}

export { Panel, PanelHeader, PanelHeading, PanelTitle, PanelDescription, PanelActions, PanelBody, PanelFooter }
