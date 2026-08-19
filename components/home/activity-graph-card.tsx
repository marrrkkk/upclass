"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { ActivityHeatmap } from "@/components/activity/activity-heatmap"
import { Button } from "@/components/ui/button"
import {
  Panel,
  PanelActions,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import { type ActivityGraphDay } from "@/lib/activity-ui"

type ActivityGraphCardProps = {
  days: ActivityGraphDay[]
  total: number
}

const intensityClasses = [
  "bg-muted",
  "border-primary-border bg-primary-surface",
  "bg-primary/35",
  "bg-primary/65",
  "bg-primary",
] as const

export function ActivityGraphCard({ days, total }: ActivityGraphCardProps) {
  const pathname = usePathname()
  const orgSlug = pathname?.split("/")[1] || ""
  const activityPath = orgSlug ? `/${orgSlug}/dashboard#activity` : "/dashboard#activity"

  return (
    <Panel padding="none" variant="panel" className="h-full overflow-hidden">
      <PanelHeader>
        <PanelHeading>
          <PanelTitle>Activity rhythm</PanelTitle>
          <PanelDescription>{total} actions in the last 18 weeks</PanelDescription>
        </PanelHeading>
        <PanelActions>
          <Button variant="ghost" size="sm" asChild>
            <Link href={activityPath}>
              View all
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </PanelActions>
      </PanelHeader>

      <PanelBody className="space-y-4">
        <div className="rounded-[var(--radius-container)] bg-surface-sunken p-4">
          <ActivityHeatmap days={days} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Text variant="caption" tone="muted" as="span">
            Less
          </Text>
          {intensityClasses.map((className) => (
            <span
              key={className}
              aria-hidden="true"
              className={`size-3 rounded-sm ${className}`}
            />
          ))}
          <Text variant="caption" tone="muted" as="span">
            More
          </Text>
        </div>
      </PanelBody>
    </Panel>
  )
}
