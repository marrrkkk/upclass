import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ActivityLogList } from "@/components/activity/activity-log-list"
import { Button } from "@/components/ui/button"
import { Panel, PanelBody } from "@/components/ui/panel"
import { SectionHeader } from "@/components/ui/section"
import type { ActivityLogPreview } from "./dashboard-types"
import { DashboardSection } from "./dashboard-shell"

type DashboardActivityProps = {
  activity: ActivityLogPreview
  orgSlug: string
  role: "admin" | "teacher" | "student"
}

/**
 * Recent activity section for dashboard.
 * Shows latest classroom or organization activity.
 */
export function DashboardActivity({ activity, orgSlug, role }: DashboardActivityProps) {
  const title = role === "admin" ? "Organization activity" : "Recent activity"
  const description = role === "admin" 
    ? "Latest organization changes."
    : "Latest work from your classroom."

  return (
    <DashboardSection>
      <SectionHeader
        title={title}
        description={description}
        actions={
          role !== "admin" ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${orgSlug}/activity`}>
                View all <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : undefined
        }
      />
      <Panel padding="none">
        <PanelBody>
          <ActivityLogList
            items={activity.items}
            emptyTitle="No recent activity"
            emptyDescription={
              role === "admin"
                ? "Organization activity will appear here."
                : "Class activity will appear here as people work."
            }
          />
        </PanelBody>
      </Panel>
    </DashboardSection>
  )
}
