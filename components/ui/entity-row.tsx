import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Text } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

type EntityRowProps = Omit<React.ComponentProps<"div">, "title"> & {
  href?: string
  media?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  metadata?: React.ReactNode
  status?: React.ReactNode
  actions?: React.ReactNode
  linkLabel?: string
}

/** Dense, responsive row for classes, files, people, and admin entities. */
function EntityRow({
  href,
  media,
  title,
  description,
  metadata,
  status,
  actions,
  linkLabel,
  className,
  ...props
}: EntityRowProps) {
  const content = (
    <>
      {media ? <div className="shrink-0">{media}</div> : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Text variant="h4" as="span" truncate className="max-w-full">
            {title}
          </Text>
          {status}
        </div>
        {description ? (
          <Text variant="small" tone="muted" truncate>
            {description}
          </Text>
        ) : null}
        {metadata ? (
          <Text variant="caption" tone="subtle" truncate>
            {metadata}
          </Text>
        ) : null}
      </div>
      {href ? (
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground"
        />
      ) : null}
    </>
  )

  return (
    <div
      data-slot="entity-row"
      className={cn("flex min-w-0 items-center", className)}
      {...props}
    >
      {href ? (
        <Link
          href={href}
          aria-label={linkLabel}
          className="group row-interactive focus-ring flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
          {content}
        </div>
      )}
      {actions ? <div className="shrink-0 pr-3 sm:pr-4">{actions}</div> : null}
    </div>
  )
}

export { EntityRow }
