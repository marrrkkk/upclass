"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { ActivityLogList } from "@/components/activity/activity-log-list"
import { Button } from "@/components/ui/button"
import {
  Panel,
  PanelActions,
  PanelBody,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { type ActivityLogItem } from "@/lib/activity-ui"

type RecentActivityCardProps = {
  items: ActivityLogItem[]
}

export function RecentActivityCard({ items }: RecentActivityCardProps) {
  const pathname = usePathname()
  const orgSlug = pathname?.split("/")[1] || ""
  const activityPath = orgSlug ? `/${orgSlug}/dashboard#activity` : "/dashboard#activity"

  return (
    <Panel padding="none" variant="panel" className="h-full overflow-hidden">
      <PanelHeader>
        <PanelHeading>
          <PanelTitle>Recent activity</PanelTitle>
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

      <PanelBody>
        <ActivityLogList
          items={items}
          emptyTitle="No recent activity"
          emptyDescription="Your latest submissions, uploads, and teaching actions will appear here."
        />
      </PanelBody>
    </Panel>
  )
}
