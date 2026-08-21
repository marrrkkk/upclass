import Link from "next/link"
import { ArrowRight, Clock3 } from "lucide-react"
import { format, isToday } from "date-fns"

import { courseToneFromValue, type CourseTone } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type TimeRailItem = {
  id: string
  title: string
  date: Date
  href: string
  courseName: string
  courseColor?: string | null
  detail?: string | null
  state?: "complete" | "urgent" | "default"
}

type TimeRailProps = {
  items: TimeRailItem[]
  title?: string
  description?: string
  emptyMessage?: string
  className?: string
}

const courseTextClasses: Record<CourseTone, string> = {
  "course-1": "text-course-1",
  "course-2": "text-course-2",
  "course-3": "text-course-3",
  "course-4": "text-course-4",
  "course-5": "text-course-5",
  "course-6": "text-course-6",
}

const stateClasses = {
  complete: "text-success-text",
  urgent: "text-warning-text",
  default: "text-muted-foreground",
}

/**
 * A chronological classroom rail. Its order describes a school day, so the
 * visual treatment encodes real structure rather than decorative numbering.
 */
function TimeRail({
  items,
  title = "Today",
  description = "What needs your attention next.",
  emptyMessage = "Nothing is scheduled right now.",
  className,
}: TimeRailProps) {
  const currentTime = new Date()
  const todayItems = items.filter((item) => isToday(item.date))
  const displayItems = todayItems.length ? todayItems : items

  return (
    <section data-slot="time-rail" aria-labelledby="time-rail-title" className={cn("border-y border-hairline", className)}>
      <header className="flex flex-wrap items-end justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="space-y-1">
          <h2 id="time-rail-title" className="type-h2">{title}</h2>
          <p className="type-small text-muted-foreground">{description}</p>
        </div>
        <span className="flex items-center gap-1.5 type-mono text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {format(currentTime, "HH:mm")}
        </span>
      </header>

      {displayItems.length ? (
        <ol className="relative border-t border-hairline">
          <li aria-label={`Now, ${format(currentTime, "HH:mm")}`} className="relative flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <span aria-hidden="true" className="absolute left-[1.78rem] top-0 h-full w-px bg-hairline sm:left-[2.03rem]" />
            <span aria-hidden="true" className="relative z-10 size-2.5 rounded-full bg-primary ring-4 ring-primary-surface" />
            <span className="type-overline text-primary-text">Now</span>
          </li>
          {displayItems.map((item) => {
            const courseTone = courseToneFromValue(item.courseColor, item.id)
            return (
              <li key={item.id} className="relative">
                <Link href={item.href} className="group focus-ring relative flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/55 sm:px-5">
                  <span aria-hidden="true" className="absolute left-[1.78rem] top-0 h-full w-px bg-hairline sm:left-[2.03rem]" />
                  <span aria-hidden="true" className={cn("relative z-10 size-2.5 rounded-full bg-current ring-4 ring-card", courseTextClasses[courseTone])} />
                  <time dateTime={item.date.toISOString()} className="w-10 shrink-0 type-mono text-muted-foreground">
                    {format(item.date, "HH:mm")}
                  </time>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-small font-semibold text-foreground">{item.title}</span>
                    <span className="block truncate type-caption text-muted-foreground">{item.courseName}{item.detail ? ` · ${item.detail}` : ""}</span>
                  </span>
                  <span className={cn("shrink-0 type-caption", stateClasses[item.state ?? "default"])}>
                    {item.state === "complete" ? "Done" : item.state === "urgent" ? "Due soon" : <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="border-t border-hairline px-4 py-8 type-small text-muted-foreground sm:px-5">{emptyMessage}</p>
      )}
    </section>
  )
}

export { TimeRail, type TimeRailItem }
