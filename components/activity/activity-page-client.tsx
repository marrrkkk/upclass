"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronRight, NotebookPen } from "lucide-react"

import { ActivityLogList } from "@/components/activity/activity-log-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { type ActivityCategory, activityFilters, type ActivityLogItem } from "@/lib/activity-ui"

type ActivityPageClientProps = {
  activeFilter: ActivityCategory
  items: ActivityLogItem[]
  nextCursor: string | null
  isLoading?: boolean
}

export function ActivityPageClient({
  activeFilter,
  items,
  nextCursor,
  isLoading = false,
}: ActivityPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function buildHref(nextFilter: ActivityCategory, cursor?: string | null) {
    const params = new URLSearchParams(searchParams.toString())

    if (nextFilter === "all") {
      params.delete("filter")
    } else {
      params.set("filter", nextFilter)
    }

    if (cursor) {
      params.set("cursor", cursor)
    } else {
      params.delete("cursor")
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">
          Your personal history across classes, coursework, teaching, and resources.
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-muted/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <NotebookPen className="size-4" />
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle className="text-lg">Activity History</CardTitle>
                <CardDescription>Filter your personal log by the type of work you want to review.</CardDescription>
              </div>
            </div>

            <Select
              value={activeFilter}
              onValueChange={(value) => router.push(buildHref(value as ActivityCategory))}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter activity" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                {activityFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ActivityLogList
              items={items}
              emptyTitle="No matching activity"
              emptyDescription="Try another filter, or keep using UpClass and your actions will appear here."
            />
          )}

          {nextCursor && !isLoading ? (
            <div className="flex justify-center pt-2">
              <Button variant="outline" asChild>
                <Link href={buildHref(activeFilter, nextCursor)}>
                  Load more
                  <ChevronRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
