import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { typographyVariants, type TypographyVariantProps } from "@/lib/design-system"

type TextProps = React.ComponentProps<"p"> &
  TypographyVariantProps & {
    /** Render the styles onto the child element instead of a wrapper. */
    asChild?: boolean
    /** Element to render when not using `asChild`. Defaults per variant. */
    as?: React.ElementType
  }

const defaultElement: Record<NonNullable<TypographyVariantProps["variant"]>, React.ElementType> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  bodyLg: "p",
  read: "p",
  body: "p",
  small: "p",
  caption: "p",
  overline: "p",
  mono: "span",
}

/**
 * The single entry point for text styling.
 *
 * `variant` controls the type scale, `tone` controls colour. Pass `as` (or
 * `asChild`) to keep the heading level semantically correct independent of size.
 *
 * ```tsx
 * <Text variant="h2" as="h3">Members</Text>
 * <Text variant="caption" tone="muted">Updated just now</Text>
 * ```
 */
function Text({ className, variant = "body", tone, truncate, asChild, as, ...props }: TextProps) {
  const Comp = asChild ? Slot : (as ?? defaultElement[variant ?? "body"])

  return (
    <Comp
      data-slot="text"
      className={cn(typographyVariants({ variant, tone, truncate }), className)}
      {...props}
    />
  )
}

/**
 * Small uppercase label that introduces a section. Use it instead of shrinking a
 * heading — it keeps the visual hierarchy readable at a glance.
 */
function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="eyebrow"
      className={cn(typographyVariants({ variant: "overline", tone: "muted" }), className)}
      {...props}
    />
  )
}

/** Inline code / identifier chip for slugs, class codes and tokens. */
function Mono({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="mono"
      className={cn(typographyVariants({ variant: "mono", tone: "muted" }), className)}
      {...props}
    />
  )
}

export { Text, Eyebrow, Mono }
