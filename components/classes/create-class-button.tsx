"use client"

import { useMemo, useState } from "react"
import { GraduationCap, Plus } from "lucide-react"

import { createClass } from "@/app/actions/classes"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { CourseSwatch } from "@/components/ui/course-identity"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ClassListMutate, OptimisticClassCard } from "@/types/classes/optimistic"

type CreateClassButtonProps = {
  iconOnly?: boolean
  orgSlug: string
  /** Optimistic mutation handle owned by the classes list. */
  mutate: ClassListMutate
  /** Whether a class creation is currently in flight. */
  pending: boolean
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

type GradeLevelValue = (typeof GRADE_LEVELS)[number]["value"]

// Six seeds that map cleanly to the six distinct finite course tones, so every
// swatch renders a visually different course identity (no two options collide).
const COURSE_COLOR_VALUES = [
  "#f43f5e", // course-1
  "#8b5cf6", // course-2
  "#ef4444", // course-3
  "#06b6d4", // course-4
  "#0e6b52", // course-5
  "#6366f1", // course-6
]

const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function CreateClassButton({ iconOnly = false, orgSlug, mutate, pending }: CreateClassButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState("#0e6b52")
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState("")
  
  // New fields for structured class identity
  const [title, setTitle] = useState("")
  const [gradeLevel, setGradeLevel] = useState<GradeLevelValue | "">("")
  const [customGrade, setCustomGrade] = useState("")
  const [section, setSection] = useState("")

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

  const handleCreate = async (formData: FormData) => {
    setError(null)
    const submittedGradeLevel = String(formData.get("gradeLevel") || "")
    if (!GRADE_LEVELS.some((grade) => grade.value === submittedGradeLevel)) {
      setError("Choose a grade level before creating the class.")
      return
    }

    const title = String(formData.get("title") || "").trim()
    const tempId = `class-${crypto.randomUUID()}`
    const optimisticClass: OptimisticClassCard = {
      id: tempId,
      tempId,
      pending: true,
      title,
      description: String(formData.get("description") || "") || null,
      category: null,
      gradeLevel: submittedGradeLevel,
      customGrade: submittedGradeLevel === "other" ? String(formData.get("customGrade") || "") || null : null,
      section: String(formData.get("section") || "") || null,
      color: String(formData.get("color") || "") || null,
      schedule: String(formData.get("schedule") || "") || null,
      createdAt: new Date().toISOString(),
      enrolledCount: 0,
      role: "teaching",
      teacherName: null,
      teacherImage: null,
      classworkCount: 0,
      students: [],
    }

    const actionPayload = {
      title,
      gradeLevel: submittedGradeLevel as GradeLevelValue,
      customGrade: optimisticClass.customGrade ?? "",
      section: optimisticClass.section ?? "",
      description: optimisticClass.description ?? "",
      color: optimisticClass.color ?? "",
      schedule: optimisticClass.schedule ?? "",
      orgSlug,
      tempId,
    }

    void mutate(
      (previous) => [optimisticClass, ...previous],
      () => createClass(formData),
      {
        offline: {
          type: "create-class",
          payload: actionPayload,
        },
        queued: {
          tempId,
          remove: (current) => current.filter((item) => item.tempId !== tempId),
        },
        onSuccess: (result, current) => {
          const classId = result.success && result.classId ? result.classId : null
          if (classId) {
            return current.map((item) =>
              item.tempId === tempId
                ? { ...item, id: classId, tempId: classId, pending: false }
                : item,
            )
          }
          return current.filter((item) => item.tempId !== tempId)
        },
        onError: (_message, current) => current.filter((item) => item.tempId !== tempId),
      },
    )

    // The optimistic class is already in the grid: close and reset immediately.
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setTitle("")
    setGradeLevel("")
    setCustomGrade("")
    setSection("")
    setSelectedDays([])
    setSelectedTime("")
    setSelectedColor("#0e6b52")
    setError(null)
  }

return (
    <>
      <Button
        type="button"
        size={iconOnly ? "icon" : "default"}
        title="Create class"
        aria-label={iconOnly ? "Create class" : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="shadow-xs font-semibold"
      >
        <Plus aria-hidden="true" className="size-4" />
        {!iconOnly ? <span>Create class</span> : null}
      </Button>
      <ResponsiveOverlay
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) resetForm()
      }}
      title={
        <span className="flex items-start gap-3">
          <IconBadge tone="primary" size="lg">
            <GraduationCap aria-hidden="true" />
          </IconBadge>
          <span className="min-w-0 pt-0.5">
            <span className="block type-h3">Create a class</span>
            <span className="mt-1 block max-w-[54ch] type-small font-normal text-muted-foreground">
              Define the class identity first. You can add schedule details when you are ready.
            </span>
          </span>
        </span>
      }
      desktopClassName="sm:max-w-[42rem]"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false)
              resetForm()
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-class-form" isLoading={pending} disabled={pending}>
            Create class
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-surface/45 px-4 py-3">
        <CourseSwatch value={selectedColor} courseKey="class-identity-preview" size="sm" />
        <div className="min-w-0">
          <p className="type-caption font-medium text-primary-text">Class identity</p>
          <p className="truncate type-small font-semibold text-foreground">{classIdentityPreview}</p>
        </div>
      </div>

      <form
        id="create-class-form"
        action={handleCreate}
        className="mt-5 flex flex-col gap-5"
      >
        <input type="hidden" name="orgSlug" value={orgSlug} />

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="title">Subject or class name</FieldLabel>
            <Input
              id="title"
              name="title"
              required
              placeholder="Mathematics"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <div className="grid gap-4 rounded-xl border border-hairline/70 bg-surface-subtle/25 p-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="gradeLevel">Grade level</FieldLabel>
              <Select
                name="gradeLevel"
                required
                value={gradeLevel}
                onValueChange={(value) => setGradeLevel(value as GradeLevelValue)}
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
          </div>

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

          <div className="rounded-xl border border-hairline/70 bg-surface-subtle/25 p-4">
            <Field>
              <FieldLabel htmlFor="class-time" optional>Meeting time</FieldLabel>
              <Input
                id="class-time"
                type="time"
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel optional>Meeting days</FieldLabel>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Meeting days">
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

          <Field className="rounded-xl border border-hairline/70 bg-surface-subtle/25 p-4">
            <FieldLabel htmlFor="description" optional>Description</FieldLabel>
            <Textarea
              id="description"
              name="description"
              placeholder="What will students learn?"
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
                  <CourseSwatch value={color} courseKey={`new-course-${index}`} size="md" />
                </button>
              ))}
              <label className="focus-within:focus-ring relative cursor-pointer rounded-lg" aria-label="Choose a custom course color">
                <input
                  type="color"
                  onChange={(event) => setSelectedColor(event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
                <CourseSwatch value={selectedColor} courseKey="custom-course-color" size="md" />
              </label>
            </div>
            <input type="hidden" name="color" value={selectedColor} />
          </Field>
        </FieldGroup>

        {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
      </form>
    </ResponsiveOverlay>
    </>
  )
}
