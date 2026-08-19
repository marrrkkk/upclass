import * as React from "react"

import { cn } from "@/lib/utils"
import { typographyVariants, type Tone } from "@/lib/design-system"
import { IconBadge } from "@/components/ui/icon-badge"

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Lucide icon element, rendered inside a themed icon badge. */
  icon?: React.ReactNode
  tone?: Tone
  title: React.ReactNode
  description?: React.ReactNode
  /** Primary and secondary actions. */
  action?: React.ReactNode
  /** `inline` sits inside a panel or table; `page` is a standalone route state. */
  size?: "inline" | "page"
}

/**
 * The one empty state in the product.
 *
 * Copy does the work here: a title that states the fact and a description that
 * says what to do next. The icon stays small on purpose — oversized art reads
 * as filler.
 */
function EmptyState({
  icon,
  tone = "neutral",
  title,
  description,
  action,
  size = "inline",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "inline" ? "gap-3 px-6 py-12" : "gap-4 px-6 py-20",
        className,
      )}
      {...props}
    >
      {icon ? (
        <IconBadge tone={tone} size={size === "page" ? "xl" : "lg"} className="mb-1">
          {icon}
        </IconBadge>
      ) : null}
      <p className={typographyVariants({ variant: size === "page" ? "h2" : "h3" })}>{title}</p>
      {description ? (
        <p
          className={cn(
            typographyVariants({ variant: "small", tone: "muted" }),
            "max-w-sm text-balance",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  )
}

export { EmptyState }
