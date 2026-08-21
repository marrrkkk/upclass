import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { IconBadge } from "@/components/ui/icon-badge"
import { Text } from "@/components/ui/typography"
import type { Tone } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type TimelineRowProps = Omit<React.ComponentProps<"div">, "title"> & {
  href?: string
  icon?: React.ReactNode
  tone?: Tone
  title: React.ReactNode
  description?: React.ReactNode
  timestamp: React.ReactNode
  dateTime?: string
  unread?: boolean
  trailing?: React.ReactNode
}

/** Scan-friendly event row for activity, notifications, and course streams. */
function TimelineRow({
  href,
  icon,
  tone = "neutral",
  title,
  description,
  timestamp,
  dateTime,
  unread = false,
  trailing,
  className,
  ...props
}: TimelineRowProps) {
  const content = (
    <>
      {icon ? <IconBadge tone={unread ? "primary" : tone} size="sm">{icon}</IconBadge> : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Text variant="h4" as="span" truncate className="max-w-full">
            {title}
          </Text>
          {unread ? (
            <span className="size-2 rounded-full bg-primary" aria-label="Unread" />
          ) : null}
        </div>
        {description ? <Text variant="small" tone="muted">{description}</Text> : null}
        <Text variant="caption" tone="subtle" asChild>
          <time dateTime={dateTime}>{timestamp}</time>
        </Text>
      </div>
      {trailing}
      {href ? <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/50" /> : null}
    </>
  )

  const sharedClassName = cn(
    "flex min-w-0 items-start gap-2.5 px-4 py-3 sm:gap-3 sm:px-5",
    unread && "bg-primary-surface/50",
  )

  return (
    <div data-slot="timeline-row" className={className} {...props}>
      {href ? (
        <Link
          href={href}
          data-unread={unread ? "true" : "false"}
          className={cn("touch-target row-interactive focus-ring group", sharedClassName)}
        >
          {content}
        </Link>
      ) : (
        <div data-unread={unread ? "true" : "false"} className={sharedClassName}>
          {content}
        </div>
      )}
    </div>
  )
}

export { TimelineRow }
