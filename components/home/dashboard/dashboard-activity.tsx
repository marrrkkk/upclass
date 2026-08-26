import Link from "next/link"
import { ActivityLogList } from "@/components/activity/activity-log-list"
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
          <Link
            href={`/${orgSlug}/activity`}
            className="type-small font-medium text-primary-text transition-opacity hover:opacity-80"
          >
            View all
          </Link>
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
