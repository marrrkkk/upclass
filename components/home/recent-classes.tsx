"use client"

import { memo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, BookOpen, FileText, GraduationCap, MessageSquare, PencilRuler, Plus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CourseSwatch } from "@/components/ui/course-identity"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Panel,
  PanelBody,
} from "@/components/ui/panel"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { SectionHeader } from "@/components/ui/section"

export type ClassItem = {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  color: string | null
  category?: string | null
  memberCount: number
  role: "teacher" | "student"
}

type RecentClassesProps = {
  classes: ClassItem[]
  userRole: "teacher" | "student" | null
}

const HomeClassTile = memo(function HomeClassTile({ classItem }: { classItem: ClassItem }) {
  return <ClassRow classItem={classItem} />
})

const ClassRow = memo(function ClassRow({ classItem }: { classItem: ClassItem }) {
  const pathname = usePathname()
  const orgSlug = pathname?.split("/")[1] || ""
  const classHref = orgSlug
    ? `/${orgSlug}/classes/${classItem.id}`
    : `/classes/${classItem.id}`
  const metadata = classItem.category || classItem.description || "Class workspace"

  return (
    <li className="min-w-0 border-b border-hairline last:border-b-0">
      <div className="group flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
        <Link
          href={classHref}
          aria-label={`View ${classItem.title} class`}
          className="touch-target focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-control)] text-foreground"
        >
          <CourseSwatch
            value={classItem.color}
            courseKey={classItem.id}
            label={`${classItem.title} course color`}
            size="lg"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <span className="block truncate type-h4 text-foreground transition-colors group-hover:text-primary-strong">
              {classItem.title}
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 type-caption text-muted-foreground">
              <span className="truncate">{metadata}</span>
              <span aria-hidden="true" className="text-hairline-strong">Â·</span>
              <span>{classItem.role === "teacher" ? "Teaching" : "Enrolled"}</span>
              <span aria-hidden="true" className="text-hairline-strong">Â·</span>
              <span className="inline-flex items-center gap-1 numeric-tabular">
                <Users aria-hidden="true" className="size-3" />
                {classItem.memberCount} {classItem.memberCount === 1 ? "student" : "students"}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <div className="flex items-center rounded-[var(--radius-control)] bg-surface p-0.5">
            <Link
              href={`${classHref}?tab=stream`}
              className="focus-ring inline-flex min-h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <MessageSquare className="size-3" aria-hidden="true" />
              <span className="hidden lg:inline">Stream</span>
            </Link>
            <Link
              href={`${classHref}?tab=classwork`}
              className="focus-ring inline-flex min-h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <FileText className="size-3" aria-hidden="true" />
              <span className="hidden lg:inline">Work</span>
            </Link>
            <Link
              href={`${classHref}?tab=whiteboard`}
              className="focus-ring inline-flex min-h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <PencilRuler className="size-3" aria-hidden="true" />
              <span className="hidden lg:inline">Board</span>
            </Link>
          </div>
          <Link
            href={classHref}
            className="touch-target focus-ring inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary-surface"
          >
            Open class
            <ArrowRight aria-hidden="true" className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </li>
  )
})

function AllClassesDialog({
  classes,
  userRole,
  open,
  onOpenChange,
}: {
  classes: ClassItem[]
  userRole: "teacher" | "student" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="All classes"
      description={
        userRole === "teacher"
          ? `You are teaching ${classes.length} classes.`
          : `You are enrolled in ${classes.length} classes.`
      }
      desktopClassName="sm:max-w-3xl"
    >
      {classes.length === 0 ? (
        <EmptyState
          icon={<GraduationCap />}
          title="No classes found"
          description="Your classes will appear here once you create or join one."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {classes.map((classItem) => (
            <HomeClassTile key={classItem.id} classItem={classItem} />
          ))}
        </ul>
      )}
    </ResponsiveOverlay>
  )
}

export function RecentClasses({ classes, userRole }: RecentClassesProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const orgSlug = pathname?.split("/")[1] || ""
  const classesPath = orgSlug ? `/${orgSlug}/classes` : "/classes"

  return (
    <>
      <AllClassesDialog
        classes={classes}
        userRole={userRole}
        open={open}
        onOpenChange={setOpen}
      />

      <SectionHeader
        title="Course overview"
        description={
          classes.length === 0
            ? "Create or join a class to begin."
            : `${classes.length} active ${classes.length === 1 ? "class" : "classes"}.`
        }
        actions={
          classes.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              View all ({classes.length})
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null
        }
      />

      <Panel padding="none" variant="panel" className="h-full overflow-hidden">
        <PanelBody className="p-0">
          {classes.length === 0 ? (
            <EmptyState
              icon={<GraduationCap />}
              title="No active classes"
              description={
                userRole === "teacher"
                  ? "Create your first class to add coursework and invite students."
                  : "Join a class to see materials, assignments, and updates."
              }
              action={
                <Button asChild>
                  <Link href={classesPath}>
                    <Plus aria-hidden="true" />
                    {userRole === "teacher" ? "Create a class" : "Join a class"}
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul>
              {classes.slice(0, 4).map((classItem) => (
                <HomeClassTile key={classItem.id} classItem={classItem} />
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </>
  )
}
