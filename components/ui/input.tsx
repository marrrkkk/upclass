import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "control-surface file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input/95 h-10 w-full min-w-0 rounded-lg border px-3 py-1 text-base shadow-xs transition-all duration-200 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:bg-[var(--control-bg-strong)] focus-visible:ring-4 focus-visible:ring-ring/15",
        "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
