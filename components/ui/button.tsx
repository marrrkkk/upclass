import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-ring relative inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-buttons)] type-small font-medium transition-[color,background-color,border-color,opacity] duration-[var(--duration-base)] ease-out-expo disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 aria-invalid:ring-2 aria-invalid:ring-destructive/25",
  {
    variants: {
      variant: {
        /** Primary action: filled UpClass Blue. */
        default: "border border-transparent bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]",
        /** Destructive action: filled Vermillion. */
        destructive: "border border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /** Secondary actions use a quiet semantic surface. */
        outline: "border border-hairline-strong bg-card text-foreground hover:bg-surface-hover active:bg-surface-active",
        secondary: "border border-transparent bg-surface-subtle text-foreground hover:bg-surface-hover active:bg-surface-active",
        soft: "border border-transparent bg-primary-surface text-primary-text hover:bg-primary-muted",
        /** Ghost text: low-emphasis command. */
        inverse: "border border-transparent bg-foreground text-background hover:bg-foreground/90",
        ghost: "border border-transparent text-foreground hover:bg-muted active:bg-secondary",
        /** Inline text action. */
        link: "rounded-[var(--radius-small)] border-0 text-primary-strong underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 gap-1 px-2 type-caption [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[var(--control-height-sm)] px-2.5",
        default: "h-[var(--control-height-md)] px-3",
        lg: "h-[var(--control-height-lg)] gap-2 px-4 type-small",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[var(--control-height-sm)]",
        icon: "size-[var(--control-height-md)]",
        "icon-lg": "size-[var(--control-height-lg)]",
        "icon-circle": "size-[var(--control-height-md)] rounded-full [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const resolvedVariant = variant ?? "default"
  const resolvedSize = size ?? "default"
  const combinedClassName = cn(buttonVariants({ variant, size, className }), fullWidth && "w-full")

  if (asChild) {
    return (
      <Slot
        data-slot="button"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={combinedClassName}
        {...props}
      >
        {children}
      </Slot>
    )
  }

  return (
    <button
      data-slot="button"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      data-loading={isLoading ? "true" : undefined}
      className={combinedClassName}
      disabled={isLoading || disabled}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner className="absolute text-current" aria-hidden="true" /> : null}
      <span
        data-slot="button-label"
        className={cn(
          "inline-flex min-w-0 items-center justify-center gap-[inherit]",
          isLoading && "invisible"
        )}
      >
        {leftIcon && <span data-slot="button-left-icon" className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>}
        {children}
        {rightIcon && <span data-slot="button-right-icon" className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>}
      </span>
    </button>
  )
}

export { Button, buttonVariants, type ButtonProps }

