import { format, parseISO } from "date-fns"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type ActivityGraphDay } from "@/lib/activity-ui"

type ActivityHeatmapProps = {
  days: ActivityGraphDay[]
  className?: string
}

function getLevelClass(level: ActivityGraphDay["level"]) {
  if (level === 0) return "bg-slate-200 dark:bg-slate-800"
  if (level === 1) return "bg-sky-100 dark:bg-sky-950/50"
  if (level === 2) return "bg-sky-300 dark:bg-sky-800"
  if (level === 3) return "bg-blue-500/80 dark:bg-blue-600"
  return "bg-primary"
}

export function ActivityHeatmap({ days, className }: ActivityHeatmapProps) {
  const weeks = Array.from(new Set(days.map((day) => day.week)))
  const cellGap = 4

  return (
    <TooltipProvider>
      <div className={cn("w-full", className)}>
        <div
          className="mx-auto grid w-full max-w-[500px] grid-flow-col grid-rows-7"
          style={{
            gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
            gap: `${cellGap}px`,
          }}
        >
          {days.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "aspect-square w-full rounded-[2px] border border-border shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] transition-transform hover:scale-110 hover:border-primary/50",
                    getLevelClass(day.level),
                    day.isToday && "ring-1 ring-primary/50 ring-offset-1 ring-offset-background",
                  )}
                  role="img"
                  aria-label={`${day.count} activities on ${format(parseISO(day.date), "MMMM d, yyyy")}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="border border-border bg-background text-foreground shadow-lg">
                {format(parseISO(day.date), "MMMM d, yyyy")}
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
