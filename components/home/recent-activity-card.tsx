import Link from "next/link"
import { ArrowRight, NotebookPen } from "lucide-react"

import { ActivityLogList } from "@/components/activity/activity-log-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ActivityLogItem } from "@/lib/activity-ui"

type RecentActivityCardProps = {
  items: ActivityLogItem[]
}

export function RecentActivityCard({ items }: RecentActivityCardProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-muted/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <NotebookPen className="size-4" />
            </div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </div>

          <Button variant="ghost" size="sm" asChild>
            <Link href="/activity">
              View all
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <ActivityLogList
          items={items}
          emptyTitle="No recent activity"
          emptyDescription="Your latest submissions, uploads, and teaching actions will appear here."
        />
      </CardContent>
    </Card>
  )
}
