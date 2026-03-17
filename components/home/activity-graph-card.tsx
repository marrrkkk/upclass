import Link from "next/link"
import { ArrowRight, CalendarRange } from "lucide-react"

import { ActivityHeatmap } from "@/components/activity/activity-heatmap"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ActivityGraphDay } from "@/lib/activity-ui"

type ActivityGraphCardProps = {
  days: ActivityGraphDay[]
  total: number
}

export function ActivityGraphCard({ days, total }: ActivityGraphCardProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-muted/5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarRange className="size-4" />
              </div>
              <CardTitle className="text-lg">Activity</CardTitle>
            </div>
            <CardDescription>{total} actions in the last 18 weeks</CardDescription>
          </div>

          <Button variant="ghost" size="sm" asChild>
            <Link href="/activity">
              View all
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 py-5">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/20 p-4 shadow-sm">
          <ActivityHeatmap days={days} />
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="size-3 rounded-[4px] border border-border bg-slate-200 dark:bg-slate-800" />
          <div className="size-3 rounded-[4px] border border-border bg-sky-100 dark:bg-sky-950/50" />
          <div className="size-3 rounded-[4px] border border-border bg-sky-300 dark:bg-sky-800" />
          <div className="size-3 rounded-[4px] border border-border bg-blue-500/80 dark:bg-blue-600" />
          <div className="size-3 rounded-[4px] bg-primary" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}
