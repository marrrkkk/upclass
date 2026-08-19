import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { typographyVariants } from "@/lib/design-system"
import { cn } from "@/lib/utils"

/**
 * Content-first surface for media, summaries, and LMS workspace tiles.
 *
 * The default is a white working surface with a quiet hairline and no shadow.
 * `accent` is reserved for a meaningful highlight surface. `dark` is an
 * intentional inverse tool surface, not a decorative hero.
 * Use `Panel` for application chrome and dense tables; use `Card` when the
 * content itself needs a distinct object boundary.
 */
const cardVariants = cva(
  "relative rounded-[var(--radius-cards)] border text-card-foreground transition-[background-color] duration-200 ease-out",
  {
    variants: {
      variant: {
        /** White card: hairline border, no shadow. */
        flat: "border-hairline bg-card",
        /** Inverse card: foreground surface, white text. */
        dark: "border-foreground bg-foreground text-background [&_p]:text-background",
        /** Accent card: meaningful highlight fill supplied by the caller. */
        accent: "border-transparent",
        interactive:
          "focus-ring border-hairline bg-card hover:bg-surface-raised active:bg-surface-sunken",
        inset: "border-transparent bg-surface-sunken",
        workspace:
          "border-hairline bg-card overflow-hidden before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-r-full before:bg-primary-strong",
      },
    },
    defaultVariants: { variant: "flat" },
  },
)

type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      data-variant={variant ?? "flat"}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  ),
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "relative flex flex-col gap-1 px-6 py-4 has-[>[data-slot=card-action]]:pr-14",
        className,
      )}
      {...props}
    />
  ),
)
CardHeader.displayName = "CardHeader"

const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn("absolute right-3 top-3 flex items-center gap-1", className)}
      {...props}
    />
  ),
)
CardAction.displayName = "CardAction"

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot="card-title"
      className={cn(typographyVariants({ variant: "h3" }), "text-balance", className)}
      {...props}
    />
  ),
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="card-description"
    className={cn(typographyVariants({ variant: "small", tone: "muted" }), "text-pretty", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-content" className={cn("px-6 pb-6", className)} {...props} />
  ),
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(
        "flex min-h-11 items-center gap-2 bg-surface-sunken/70 px-4 py-2.5",
        className,
      )}
      {...props}
    />
  ),
)
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
}
