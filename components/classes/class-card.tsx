"use client"

import { memo } from "react"
import Link from "next/link"
import { ArrowUpRight, CalendarClock, Users } from "lucide-react"

import { EntityAvatar } from "@/components/ui/entity-avatar"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { courseToneFromValue, monogram, type CourseTone } from "@/lib/design-system"
import { formatRelativeTime, formatShortDate } from "@/lib/format"
import { getGradeLevelFallback } from "@/lib/classes/class-identity"
import { cn } from "@/lib/utils"
import type { ClassCardData } from "@/types/classes"

type ClassCardProps = {
  data: ClassCardData
  layout?: "grid" | "list"
  onHoverStart: (href: string) => void
  onHoverEnd: (href: string) => void
}

/** Poster field: the class accent as a soft tinted surface. */
const posterToneClasses: Record<CourseTone, string> = {
  "course-1": "bg-course-1/15 text-course-1",
  "course-2": "bg-course-2/15 text-course-2",
  "course-3": "bg-course-3/15 text-course-3",
  "course-4": "bg-course-4/15 text-course-4",
  "course-5": "bg-course-5/15 text-course-5",
  "course-6": "bg-course-6/15 text-course-6",
}

function studentSummary(count: number) {
  if (count <= 0) return "No students yet"
  return `${count} ${count === 1 ? "student" : "students"}`
}

function classworkSummary(count: number) {
  return `${count} classwork ${count === 1 ? "item" : "items"}`
}

/** Course accent banner with monogram emblem and enrolled count overlay. */
function CoursePoster({
  tone,
  title,
  enrolledCount,
  isList = false,
}: {
  tone: CourseTone
  title: string
  enrolledCount: number
  isList?: boolean
}) {
  return (
    <div
      data-slot="course-hero"
      data-tone={tone}
      className={cn(
        "relative overflow-hidden transition-colors duration-200",
        posterToneClasses[tone],
        isList ? "h-full min-h-28" : "h-36",
      )}
    >
      {/* Decorative geometry */}
      <span
        aria-hidden="true"
        className="absolute -right-8 -top-12 size-28 rotate-12 rounded-[2rem] border-[14px] border-current opacity-15"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-12 left-[28%] size-24 -rotate-12 rounded-[1.5rem] border-[10px] border-current opacity-10"
      />

      {/* Enrolled badge overlay */}
      <div className="absolute left-3 top-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-card/90 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-sm backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10">
          <Users className="size-3 opacity-70" aria-hidden="true" />
          {enrolledCount} Enrolled
        </span>
      </div>
          <span className="sr-only">{enrolledCount}</span>
          {enrolledCount > 0 ? <span className="sr-only">{studentSummary(enrolledCount)}</span> : null}

      {/* Monogram + arrow */}
      <div className="absolute inset-0 flex items-end justify-between p-3.5">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card/90 font-display text-base font-bold text-foreground shadow-2xs backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10"
        >
          {monogram(title)}
        </span>

        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-lg bg-card/80 text-muted-foreground shadow-2xs backdrop-blur-md transition-all duration-200 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  )
}

export const ClassCard = memo(function ClassCard({
  data,
  layout = "grid",
  onHoverStart,
  onHoverEnd,
}: ClassCardProps) {
  const organizationPath = useOrganizationPath()
  const classHref = organizationPath(`/classes/${data.id}`)
  const courseTone = courseToneFromValue(data.color, data.id)
  const isList = layout === "list"

  const teacherName = data.teacherName || "Teacher"
  const enrolledCount = data.enrolledCount
  const studentLabel = studentSummary(enrolledCount)
  const classworkCount = data.classworkCount ?? 0
  const scheduleText = data.schedule || "Flexible schedule"
  
  // Structured identity fields
  const gradeLabel = getGradeLevelFallback(data)
  const sectionLabel = data.section

  // The class row carries its own last-changed stamp; fall back to creation for
  // offline cache entries written before it was cached.
  const changedAt = data.updatedAt || data.createdAt
  const changedLabel = formatRelativeTime(changedAt)
  const changedTitle = formatShortDate(changedAt)

  const accessibleName = [
    data.title,
    studentLabel,
    classworkCount > 0 ? classworkSummary(classworkCount) : null,
    teacherName,
    data.schedule ? `Schedule: ${data.schedule}` : null,
    changedLabel ? `updated ${changedLabel}` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div role="listitem" className="min-w-0">
      <Link
        href={classHref}
        onMouseEnter={() => onHoverStart(classHref)}
        onMouseLeave={() => onHoverEnd(classHref)}
        aria-label={accessibleName}
        className={cn(
          "group focus-ring flex h-full flex-col overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1 transition-all duration-200 ease-out-expo hover:shadow-e2 hover:border-primary-border/60 hover:-translate-y-0.5",
          isList
            ? "grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)]"
            : "",
        )}
        data-slot="class-card"
        data-layout={layout}
        data-course-tone={courseTone}
      >
        <CoursePoster
          tone={courseTone}
          title={data.title}
          enrolledCount={enrolledCount}
          isList={isList}
        />

        {isList ? (
          /* ── List layout ── */
          <div className="flex min-w-0 flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-6 sm:p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h2 className="line-clamp-2 type-h2 tracking-[-0.01em] text-foreground transition-colors duration-[var(--duration-fast)] ease-out-expo group-hover:text-primary-strong">
                {data.title}
              </h2>
              {data.description ? (
                <p className="line-clamp-2 max-w-2xl type-small text-muted-foreground">
                  {data.description}
                </p>
              ) : null}
              {/* Tags: grade + section + schedule */}
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {gradeLabel}
                </span>
                {sectionLabel ? (
                  <span className="inline-flex items-center rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {sectionLabel}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <CalendarClock className="size-3 opacity-70" aria-hidden="true" />
                  <span className="truncate max-w-[130px]">{scheduleText}</span>
                </span>
              </div>
            </div>
            {/* Teacher */}
            <div className="flex min-w-0 items-center gap-2 sm:w-44 sm:justify-end">
              <EntityAvatar name={teacherName} image={data.teacherImage} size="sm" />
              <span className="min-w-0 truncate text-xs font-semibold text-foreground/90">
                {teacherName}
              </span>
            </div>
          </div>
        ) : (
          /* ── Grid layout ── */
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
              {/* Title */}
              <h2 className="line-clamp-2 font-display text-[15px] font-bold leading-snug tracking-tight text-foreground transition-colors duration-[var(--duration-fast)] ease-out-expo group-hover:text-primary-strong">
                {data.title}
              </h2>

              {/* Description */}
              {data.description ? (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {data.description}
                </p>
              ) : (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/50 italic">
                  No description provided
                </p>
              )}

              {/* Tags: grade + section + schedule */}
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 mt-auto pt-1">
                <span className="sr-only">{classworkCount}</span>
                <span className="inline-flex items-center rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {gradeLabel}
                </span>
                {sectionLabel ? (
                  <span className="inline-flex items-center rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {sectionLabel}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-md border border-hairline/70 bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <CalendarClock className="size-3 opacity-70" aria-hidden="true" />
                  <span className="truncate max-w-[130px]">{scheduleText}</span>
                </span>
              </div>
            </div>

            {/* Footer: teacher avatar + name */}
            <div className="flex items-center gap-2.5 border-t border-hairline/70 px-4 py-3 bg-surface-subtle/30">
              <div
                role="group"
                aria-label={enrolledCount > 0 ? `${teacherName} and ${enrolledCount} students` : teacherName}
                className="flex items-center gap-1"
              >
                <EntityAvatar name={teacherName} image={data.teacherImage} size="sm" />
                {(data.students ?? []).slice(0, 3).map((student) => (
                  <EntityAvatar key={student.id} name={student.name} image={student.image} size="sm" />
                ))}
                {enrolledCount > 3 ? (
                  <span className="type-caption font-semibold text-muted-foreground">+{enrolledCount - 3}</span>
                ) : null}
              </div>
              <span className="min-w-0 truncate text-xs font-semibold text-foreground/90">
                {teacherName}
              </span>
              {enrolledCount === 0 ? <span className="type-caption text-muted-foreground">No students yet</span> : null}
            </div>
          </>
        )}
        {changedAt ? (
        <time
          dateTime={changedAt || undefined}
          title={changedTitle ? `Updated ${changedTitle}` : undefined}
          suppressHydrationWarning
          className="sr-only"
        >
          {changedLabel}
        </time>
      ) : null}
      </Link>
    </div>
  )
})
