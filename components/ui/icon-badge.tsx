import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { iconBadgeVariants, type IconBadgeVariantProps } from "@/lib/design-system"

type IconBadgeProps = React.ComponentProps<"span"> &
  IconBadgeVariantProps & {
    asChild?: boolean
  }

/**
 * Rounded container that gives a single Lucide icon emphasis.
 *
 * Sizing and colour come from the theme, so icon treatment stays identical
 * across every surface. Icons are decorative by default — put the label on the
 * surrounding control.
 *
 * ```tsx
 * <IconBadge tone="primary" size="lg"><Users /></IconBadge>
 * ```
 */
function IconBadge({ className, tone, variant, size, asChild, ...props }: IconBadgeProps) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="icon-badge"
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn(iconBadgeVariants({ tone, variant, size }), className)}
      {...props}
    />
  )
}

export { IconBadge }
