import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--control-height-md)] w-full min-w-0 rounded-[var(--radius-control)] border border-hairline-strong bg-card px-2.5 py-1 type-small text-foreground outline-none placeholder:text-muted-foreground/80 selection:bg-primary selection:text-primary-foreground transition-[border-color,box-shadow] duration-[var(--duration-fast)] file:border-0 file:bg-transparent file:type-small file:font-medium disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"

export { Input }
