"use client"

import { useSyncExternalStore } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type ActivityGraphDay } from "@/lib/activity-ui"
import { cn } from "@/lib/utils"

type ActivityHeatmapProps = {
  days: ActivityGraphDay[]
  className?: string
}

function getLevelClass(level: ActivityGraphDay["level"]) {
  if (level === 0) return "bg-muted"
  if (level === 1) return "border-primary-border bg-primary-surface"
  if (level === 2) return "bg-primary/35"
  if (level === 3) return "bg-primary-strong/65"
  return "bg-primary-strong"
}

const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ActivityHeatmap({ days, className }: ActivityHeatmapProps) {
  const hasHydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
  const weeks = Array.from(new Set(days.map((day) => day.week)))

  if (!hasHydrated) {
    return (
      <div className={cn("scroll-x-region w-full", className)}>
        <div
          className="mx-auto grid w-full max-w-lg min-w-[32rem] grid-flow-col grid-rows-7 gap-1"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          {days.map((day) => (
            <div
              key={day.date}
              className={cn(
                "aspect-square w-full rounded-sm border border-hairline",
                getLevelClass(day.level),
                day.isToday && "ring-1 ring-primary ring-offset-1 ring-offset-background",
              )}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn("scroll-x-region w-full", className)}>
        <div
          className="mx-auto grid w-full max-w-lg min-w-[32rem] grid-flow-col grid-rows-7 gap-1"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          {days.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "aspect-square w-full rounded-sm border border-hairline transition-colors hover:border-hairline-strong",
                    getLevelClass(day.level),
                    day.isToday && "ring-1 ring-primary ring-offset-1 ring-offset-background",
                  )}
                  role="img"
                  aria-label={day.ariaLabel}
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="border border-hairline bg-surface-raised text-foreground shadow-e2"
              >
                {day.displayDate}
                <span className="mx-1 text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {day.count} {day.count === 1 ? "activity" : "activities"}
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
