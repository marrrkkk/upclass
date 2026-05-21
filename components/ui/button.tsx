import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Spinner } from "./spinner"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium shrink-0 select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "button-primary-fixed hover:-translate-y-px",
        destructive:
          "button-destructive-fixed hover:-translate-y-px",
        outline:
          "border control-surface hover:bg-[var(--control-bg-strong)] hover:shadow-[var(--control-shadow-hover)]",
        secondary:
          "border control-surface-secondary",
        ghost:
          "control-ghost-surface hover:bg-[var(--control-accent-bg)]",
        link: "bg-transparent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-8 px-3 text-sm rounded-md",
        lg: "h-11 px-6 text-base rounded-lg",
        icon: "size-9",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    isLoading?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot>
    )
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <Spinner
          className={cn(
            "text-current",
            size?.includes("icon") ? "" : "mr-2"
          )}
        />
      )}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
