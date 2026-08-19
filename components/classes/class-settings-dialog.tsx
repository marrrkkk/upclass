"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Settings, Trash2 } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"

import { deleteClass, updateClass } from "@/app/actions/classes"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { CopyButton } from "@/components/ui/copy-button"
import { CourseSwatch } from "@/components/ui/course-identity"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { Field, FieldGroup, FieldHelp, FieldLabel, FieldRow } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mono, Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { cn } from "@/lib/utils"

type ClassData = {
  id: string
  title: string
  description: string | null
  category: string | null
  gradeLevel: string | null
  customGrade: string | null
  section: string | null
  code: string
  color: string
  schedule: string | null
}

type ClassSettingsDialogProps = {
  classData: ClassData
  trigger?: React.ReactNode
}

const GRADE_LEVELS = [
  { value: "kindergarten", label: "Kindergarten" },
  { value: "grade_1", label: "Grade 1" },
  { value: "grade_2", label: "Grade 2" },
  { value: "grade_3", label: "Grade 3" },
  { value: "grade_4", label: "Grade 4" },
  { value: "grade_5", label: "Grade 5" },
  { value: "grade_6", label: "Grade 6" },
  { value: "grade_7", label: "Grade 7" },
  { value: "grade_8", label: "Grade 8" },
  { value: "grade_9", label: "Grade 9" },
  { value: "grade_10", label: "Grade 10" },
  { value: "grade_11", label: "Grade 11" },
  { value: "grade_12", label: "Grade 12" },
  { value: "college", label: "College" },
  { value: "other", label: "Other" },
] as const

const COURSE_COLOR_VALUES = [
  "#0e6b52",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
]

const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function parseSchedule(schedule: string | null) {
  if (!schedule) return { days: [], time: "" }

  try {
    const parts = schedule.trim().split(" ")
    const timePart = parts.slice(-2).join(" ")
    const daysPart = parts.slice(0, -2).join(" ").replace(/,/g, "").split(" ")
    const date = new Date(`2000-01-01 ${timePart}`)
    const time = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

    return {
      days: daysPart.filter((day) => SCHEDULE_DAYS.includes(day)),
      time,
    }
  } catch {
    return { days: [], time: "" }
  }
}

export function ClassSettingsDialog({ classData, trigger }: ClassSettingsDialogProps) {
  const router = useRouter()
  const organizationPath = useOrganizationPath()
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [selectedColor, setSelectedColor] = useState(classData.color || "#0e6b52")
  const initialSchedule = parseSchedule(classData.schedule)
  const [selectedDays, setSelectedDays] = useState<string[]>(initialSchedule.days)
  const [selectedTime, setSelectedTime] = useState(initialSchedule.time)
  
  // New structured fields
  const [title, setTitle] = useState(classData.title)
  const [gradeLevel, setGradeLevel] = useState<string>(classData.gradeLevel || "")
  const [customGrade, setCustomGrade] = useState(classData.customGrade || "")
  const [section, setSection] = useState(classData.section || "")

  // Live identity preview
  const classIdentityPreview = useMemo(() => {
    const parts: string[] = []
    
    if (title.trim()) {
      parts.push(title.trim())
    }
    
    if (gradeLevel) {
      const gradeLevelLabel = GRADE_LEVELS.find((g) => g.value === gradeLevel)?.label
      if (gradeLevel === "other" && customGrade.trim()) {
        parts.push(customGrade.trim())
      } else if (gradeLevelLabel) {
        parts.push(gradeLevelLabel)
      }
    }
    
    if (section.trim()) {
      parts.push(section.trim())
    }
    
    return parts.length > 0 ? parts.join(" - ") : "Preview will appear here"
  }, [title, gradeLevel, customGrade, section])

  const handleUpdate = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await updateClass(classData.id, formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      setOpen(false)
    })
  }

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteClass(classData.id)
      if (!res.success) {
        setError(res.error)
        setDeleteDialogOpen(false)
        return
      }
      setDeleteDialogOpen(false)
      setOpen(false)
      router.push(organizationPath("/classes"))
    })
  }

  return (
    <>
      <Slot
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {trigger || (
          <Button type="button" variant="outline" size="icon" aria-label="Class settings">
            <Settings aria-hidden="true" />
          </Button>
        )}
      </Slot>
      <ResponsiveOverlay
        open={open}
        onOpenChange={setOpen}
        title="Class settings"
        description="Update course information, schedule, and access."
        desktopClassName="sm:max-w-[38rem]"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="class-settings-form" disabled={pending}>
              {pending ? "Updating..." : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="class-settings-form" action={handleUpdate} className="space-y-5">
          <div className="rounded-lg border border-hairline bg-surface-sunken p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <Text variant="h4">Invite code</Text>
                <Mono className="block type-h3 text-foreground">{classData.code}</Mono>
                <Text variant="caption" tone="muted">Share this code so students can join.</Text>
              </div>
              <CopyButton value={classData.code} label="class invite code" showLabel variant="outline" />
            </div>
          </div>

          {/* Class Identity Preview */}
          <div className="rounded-lg border border-hairline/70 bg-surface-raised px-4 py-3 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground mb-1">Class identity</p>
            <p className="text-sm font-semibold text-foreground">
              {classIdentityPreview}
            </p>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Subject or class name</FieldLabel>
              <Input
                id="title"
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <FieldRow>
              <Field>
                <FieldLabel htmlFor="gradeLevel">Grade level</FieldLabel>
                <Select
                  name="gradeLevel"
                  required
                  value={gradeLevel}
                  onValueChange={setGradeLevel}
                >
                  <SelectTrigger id="gradeLevel">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {gradeLevel === "other" ? (
                <Field>
                  <FieldLabel htmlFor="customGrade">Custom grade</FieldLabel>
                  <Input
                    id="customGrade"
                    name="customGrade"
                    required
                    placeholder="Year 1 College"
                    value={customGrade}
                    onChange={(e) => setCustomGrade(e.target.value)}
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="section" optional>Section</FieldLabel>
                  <Input
                    id="section"
                    name="section"
                    placeholder="Rizal"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  />
                </Field>
              )}
            </FieldRow>

            {gradeLevel === "other" && (
              <Field>
                <FieldLabel htmlFor="section-other" optional>Section</FieldLabel>
                <Input
                  id="section-other"
                  name="section"
                  placeholder="Rizal"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </Field>
            )}

            <FieldRow>
              <Field>
                <FieldLabel htmlFor="settings-time" optional>Meeting time</FieldLabel>
                <Input
                  id="settings-time"
                  type="time"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                />
              </Field>
            </FieldRow>

            <Field>
              <FieldLabel optional>Meeting days</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {SCHEDULE_DAYS.map((day) => {
                  const selected = selectedDays.includes(day)
                  return (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      onClick={() => {
                        setSelectedDays((current) =>
                          current.includes(day)
                            ? current.filter((value) => value !== day)
                            : [...current, day],
                        )
                      }}
                    >
                      {day}
                    </Button>
                  )
                })}
              </div>
              <input
                type="hidden"
                name="schedule"
                value={
                  selectedDays.length > 0 && selectedTime
                    ? `${selectedDays.join(", ")} ${new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                    : ""
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description" optional>Description</FieldLabel>
              <Textarea
                id="description"
                name="description"
                defaultValue={classData.description || ""}
                rows={3}
                className="resize-none"
              />
            </Field>

            <Field>
              <FieldLabel>Course color</FieldLabel>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Course color">
                {COURSE_COLOR_VALUES.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select course color ${index + 1}`}
                    aria-pressed={selectedColor === color}
                    className={cn(
                      "focus-ring rounded-lg",
                      selectedColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                  >
                    <CourseSwatch value={color} courseKey={`${classData.id}-${index}`} size="md" />
                  </button>
                ))}
                <label className="focus-within:focus-ring relative cursor-pointer rounded-lg" aria-label="Choose a custom course color">
                  <input
                    type="color"
                    onChange={(event) => setSelectedColor(event.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                  <CourseSwatch value={selectedColor} courseKey={`${classData.id}-custom`} size="md" />
                </label>
              </div>
              <input type="hidden" name="color" value={selectedColor} />
              <FieldHelp>The stored color is mapped to an accessible course accent.</FieldHelp>
            </Field>
          </FieldGroup>

          {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}

          <Callout
            tone="danger"
            action={
              <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 aria-hidden="true" />
                Delete class
              </Button>
            }
          >
            <Text variant="h4" tone="danger">Danger zone</Text>
            <Text variant="caption" tone="muted">Permanently delete this class and all course data.</Text>
          </Callout>
        </form>
      </ResponsiveOverlay>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[26rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconBadge tone="danger" size="sm"><Trash2 /></IconBadge>
              Delete class
            </AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <Callout tone="danger" icon={false}>
            Permanently delete {classData.title}, including all announcements, classwork, quizzes, and submissions?
          </Callout>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deletePending}
            >
              <Trash2 aria-hidden="true" />
              {deletePending ? "Deleting..." : "Delete class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
