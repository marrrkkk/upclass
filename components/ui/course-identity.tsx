import * as React from "react"

import { cn } from "@/lib/utils"
import {
  courseToneFromValue,
  typographyVariants,
  type CourseTone,
} from "@/lib/design-system"

const courseToneClasses: Record<CourseTone, string> = {
  "course-1": "border-course-1/25 bg-course-1/12 text-course-1",
  "course-2": "border-course-2/25 bg-course-2/12 text-course-2",
  "course-3": "border-course-3/25 bg-course-3/12 text-course-3",
  "course-4": "border-course-4/25 bg-course-4/12 text-course-4",
  "course-5": "border-course-5/25 bg-course-5/12 text-course-5",
  "course-6": "border-course-6/25 bg-course-6/12 text-course-6",
}

const courseDotClasses: Record<CourseTone, string> = {
  "course-1": "bg-course-1",
  "course-2": "bg-course-2",
  "course-3": "bg-course-3",
  "course-4": "bg-course-4",
  "course-5": "bg-course-5",
  "course-6": "bg-course-6",
}

type CourseSwatchProps = Omit<React.ComponentProps<"span">, "color"> & {
  value?: string | null
  courseKey: string
  label?: string
  size?: "sm" | "md" | "lg"
}

/** A safe visual replacement for rendering user-stored class colours inline. */
function CourseSwatch({
  value,
  courseKey,
  label,
  size = "md",
  className,
  ...props
}: CourseSwatchProps) {
  const tone = courseToneFromValue(value, courseKey)

  return (
    <span
      data-slot="course-swatch"
      data-tone={tone}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border",
        courseToneClasses[tone],
        size === "sm" && "size-3 rounded-full border-0",
        size === "md" && "size-9",
        size === "lg" && "size-11 rounded-xl",
        className,
      )}
      {...props}
    >
      {size !== "sm" ? (
        <span className={cn("size-2 rounded-full", courseDotClasses[tone])} />
      ) : null}
    </span>
  )
}

type CourseIdentityProps = React.ComponentProps<"div"> & {
  title: React.ReactNode
  metadata?: React.ReactNode
  color?: string | null
  courseKey: string
  size?: "sm" | "md"
}

/** Compact course marker, title, and metadata used across rows and headers. */
function CourseIdentity({
  title,
  metadata,
  color,
  courseKey,
  size = "md",
  className,
  ...props
}: CourseIdentityProps) {
  return (
    <div
      data-slot="course-identity"
      className={cn("flex min-w-0 items-center gap-3", className)}
      {...props}
    >
      <CourseSwatch value={color} courseKey={courseKey} size={size === "sm" ? "md" : "lg"} />
      <div className="min-w-0">
        <p
          className={cn(
            typographyVariants({ variant: size === "sm" ? "h4" : "h3" }),
            "truncate",
          )}
        >
          {title}
        </p>
        {metadata ? (
          <p className={cn(typographyVariants({ variant: "caption", tone: "muted" }), "truncate")}>
            {metadata}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export { CourseIdentity, CourseSwatch }
