"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { ActivityLogList } from "@/components/activity/activity-log-list"
import { Button } from "@/components/ui/button"
import { FilterToolbar } from "@/components/ui/filter-toolbar"
import {
  Panel,
  PanelDescription,
  PanelFooter,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ActivityCategory, activityFilters, type ActivityLogItem } from "@/lib/activity-ui"

type ActivityPageClientProps = {
  activeFilter: ActivityCategory
  items: ActivityLogItem[]
  nextCursor: string | null
}

export function buildActivityHref(
  pathname: string,
  currentSearchParams: string,
  nextFilter: ActivityCategory,
  cursor?: string | null,
) {
  const params = new URLSearchParams(currentSearchParams)

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

export function ActivityPageClient({
  activeFilter,
  items,
  nextCursor,
}: ActivityPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentSearchParams = searchParams.toString()

  return (
    <>
      <FilterToolbar
        label="Activity filters"
        filters={(
          <>
            <label htmlFor="activity-filter" className="sr-only">
              Filter activity by type
            </label>
            <Select
              value={activeFilter}
              onValueChange={(value) => {
                router.push(
                  buildActivityHref(
                    pathname,
                    currentSearchParams,
                    value as ActivityCategory,
                  ),
                )
              }}
            >
              <SelectTrigger id="activity-filter" aria-label="Filter activity by type" className="w-full sm:w-56">
                <SelectValue placeholder="Filter activity" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {activityFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </>
        )}
        summary={(
          <span className="numeric-tabular type-small">
            {items.length} {items.length === 1 ? "event" : "events"}<span className="hidden sm:inline"> shown</span>
          </span>
        )}
      />

      <Panel padding="none" className="overflow-hidden">
        <PanelHeader>
          <PanelHeading>
            <PanelTitle>Activity history</PanelTitle>
            <PanelDescription>
              A chronological record of your classes, coursework, teaching, and resources.
            </PanelDescription>
          </PanelHeading>
        </PanelHeader>

        <ActivityLogList
          items={items}
          emptyTitle="No matching activity"
          emptyDescription="Try another filter, or keep using UpClass and your actions will appear here."
        />

        {nextCursor ? (
          <PanelFooter className="justify-end">
            <Button variant="outline" asChild>
              <Link
                href={buildActivityHref(
                  pathname,
                  currentSearchParams,
                  activeFilter,
                  nextCursor,
                )}
              >
                Load more
                <ChevronRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </PanelFooter>
        ) : null}
      </Panel>
    </>
  )
}
