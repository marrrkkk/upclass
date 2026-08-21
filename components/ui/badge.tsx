import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Pill tag — DESIGN.md Pill Tag.
 *
 * Category labels, status indicators, counts. Uses pill shape (full round),
 * colored fill or hairline surface. For lifecycle/role state prefer
 * `StatusBadge`, which maps a semantic `tone` to the same tokens.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-3 py-1 type-caption font-medium transition-[background-color,transform] duration-200 ease-out [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  {
    variants: {
      variant: {
        default: "border-hairline bg-muted/70 text-foreground [a&]:hover:bg-muted",
        primary: "border-primary-border bg-primary-surface text-primary-text [a&]:hover:bg-primary-surface/80",
        secondary: "border-hairline bg-muted/70 text-foreground [a&]:hover:bg-muted",
        success: "border-success-border bg-success-surface text-success-text",
        warning: "border-warning-border bg-warning-surface text-warning-text",
        info: "border-info-border bg-info-surface text-info-text",
        destructive: "border-destructive-border bg-destructive-surface text-destructive-text",
        outline: "border-hairline bg-transparent text-foreground [a&]:hover:bg-muted/60",
        solid: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-[var(--primary-hover)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
