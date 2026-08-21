import * as React from "react"

import { cn } from "@/lib/utils"
import { statusDotVariants, tonePillVariants, type TonePillVariantProps } from "@/lib/design-system"

type StatusBadgeProps = React.ComponentProps<"span"> &
  TonePillVariantProps & {
    /** Show a leading status dot in the same tone. */
    dot?: boolean
  }

/**
 * Semantic status pill for roles, states and lifecycle labels.
 *
 * Use this rather than `Badge` with hand-picked colour classes: the tone maps to
 * theme tokens, so contrast holds in both light and dark mode.
 *
 * ```tsx
 * <StatusBadge tone="success" dot>Active</StatusBadge>
 * <StatusBadge tone="warning">Expiring</StatusBadge>
 * ```
 */
function StatusBadge({ className, tone, size, dot = false, children, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(tonePillVariants({ tone, size }), className)}
      {...props}
    >
      {dot ? (
        <span
          className={cn(statusDotVariants({ tone, size: "sm" }), "opacity-90")}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  )
}

export { StatusBadge }
