import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-20 w-full rounded-[var(--radius-control)] border border-hairline-strong bg-card px-2.5 py-2 type-small text-foreground outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-out-expo hover:border-foreground/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
