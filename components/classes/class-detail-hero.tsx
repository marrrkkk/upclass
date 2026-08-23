"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Clock, Plus, Settings } from "lucide-react"

import { ClassSettingsDialog, type ClassSettingsMutate } from "@/components/classes/class-settings-dialog"
import { AvatarGroup, type AvatarGroupPerson } from "@/components/ui/avatar-group"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { StatusBadge } from "@/components/ui/status-badge"
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation"
import { getGradeLevelFallback } from "@/lib/classes/class-identity"
import type { ClassData } from "@/types/classes"

type MemberPreview = {
  id: string
  name: string | null
  image?: string | null
}

type ClassDetailHeroProps = {
  classData: ClassData
  classColor: string
  userRole: "teacher" | "student" | null
  enrolledCount: number
  teacherNames?: string[]
  teachers?: MemberPreview[]
  students?: MemberPreview[]
  /** Nearest upcoming due date (student), used for the next-due chip. */
  nextDueDate: string | null
}

export function ClassDetailHero({
  classData,
  classColor,
  userRole,
  enrolledCount,
  teacherNames = [],
  teachers = [],
  students = [],
  nextDueDate,
}: ClassDetailHeroProps) {
  // Local display copy of the class record so optimistic settings updates can
  // render immediately and roll back on failure. Re-synced whenever the server
  // revalidates with fresh data.
  const [displayClass, setDisplayClass] = useState(classData)
  useEffect(() => {
    setDisplayClass(classData)
  }, [classData])
  const { mutate, pending } = useOptimisticMutation<ClassData>(displayClass, setDisplayClass)
  const mutateSettings = mutate as ClassSettingsMutate

  // Derive primary teacher
  const primaryTeacher = teachers[0] || (teacherNames[0] ? { id: "teacher-1", name: teacherNames[0], image: null } : null)
  const studentPeople: AvatarGroupPerson[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    image: s.image,
  }))
  
  // Structured identity
  const gradeLabel = getGradeLevelFallback(displayClass)
  const sectionLabel = displayClass.section

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline/80 bg-card p-5 shadow-e1 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <CourseSwatch
            value={displayClass.color || classColor}
            courseKey={displayClass.id}
            label={`${displayClass.title} course color`}
            size="lg"
            className="shrink-0 rounded-2xl shadow-sm"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="truncate font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {displayClass.title}
            </h1>

            {/* Metadata row: Grade + Section + Schedule + Teacher Avatar + Student AvatarGroup */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-hairline/70 bg-surface-raised px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-2xs">
                {gradeLabel}
              </span>

              {sectionLabel ? (
                <span className="inline-flex items-center rounded-md border border-hairline/70 bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-muted-foreground shadow-2xs">
                  {sectionLabel}
                </span>
              ) : null}

              {displayClass.schedule ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-hairline/70 bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-muted-foreground shadow-2xs">
                  <CalendarClock className="size-3.5 opacity-70" aria-hidden="true" />
                  <span>{displayClass.schedule}</span>
                </span>
              ) : null}

              {/* Teacher avatar and name */}
              {primaryTeacher ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-hairline/70 bg-surface-raised/80 py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-foreground shadow-2xs">
                  <EntityAvatar
                    name={primaryTeacher.name}
                    image={primaryTeacher.image}
                    size="xs"
                  />
                  <span className="truncate max-w-[150px]">{primaryTeacher.name}</span>
                </div>
              ) : null}

              {/* Student avatar group / empty state circle */}
              {enrolledCount > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-hairline/70 bg-surface-raised/80 py-0.5 pl-1 pr-2.5 text-xs font-medium text-muted-foreground shadow-2xs">
                  <AvatarGroup
                    people={studentPeople}
                    total={enrolledCount}
                    max={3}
                    size="xs"
                    label={`${enrolledCount} enrolled`}
                  />
                  <span className="font-semibold text-foreground/80">{enrolledCount} enrolled</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-hairline/80 bg-surface-raised/50 py-0.5 pl-1 pr-2.5 text-xs text-muted-foreground shadow-2xs">
                  <span className="flex size-5 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                    <Plus className="size-3" aria-hidden="true" />
                  </span>
                  <span>0 enrolled</span>
                </div>
              )}
            </div>

            {/* Description */}
            {displayClass.description ? (
              <p className="max-w-[70ch] text-xs leading-relaxed text-muted-foreground sm:text-sm pt-0.5">
                {displayClass.description}
              </p>
            ) : null}
          </div>
        </div>

        {/* Right actions */}
        {userRole === "teacher" ? (
          <div className="flex shrink-0 items-center gap-2 self-start">
            <div className="inline-flex items-center gap-2 rounded-lg border border-hairline/80 bg-surface-raised/90 px-3 py-1.5 text-xs font-mono font-bold text-foreground shadow-2xs">
              <span>{displayClass.code}</span>
              <CopyButton
                value={displayClass.code}
                label="Join code"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              />
            </div>

            <ClassSettingsDialog
              classData={displayClass}
              mutate={mutateSettings}
              pending={pending}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="touch-target size-8 rounded-lg border-hairline/80 bg-surface-raised/90 hover:bg-surface md:size-8"
                  aria-label="Class settings"
                >
                  <Settings className="size-4" aria-hidden="true" />
                </Button>
              }
            />
          </div>
        ) : nextDueDate ? (
          <div className="shrink-0 self-start">
            <StatusBadge tone="warning" dot className="shadow-2xs">
              <Clock className="size-3.5" aria-hidden="true" />
              Due {new Date(nextDueDate).toLocaleDateString()}
            </StatusBadge>
          </div>
        ) : null}
      </div>
    </div>
  )
}
