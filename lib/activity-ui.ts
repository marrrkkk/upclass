export const activityFilters = [
  { value: "all", label: "All" },
  { value: "classes", label: "Classes" },
  { value: "teaching", label: "Teaching" },
  { value: "coursework", label: "Coursework" },
  { value: "resources", label: "Resources" },
] as const

export type ActivityCategory = (typeof activityFilters)[number]["value"]

export type ActivityGraphDay = {
  date: string
  displayDate: string
  ariaLabel: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
  weekday: number
  week: number
  isToday: boolean
}

export type ActivityLogItem = {
  id: string
  eventType: string
  title: string
  description: string | null
  occurredAt: string
  classId: string | null
  className: string | null
  href: string
  category: Exclude<ActivityCategory, "all">
}

export function getActivityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

export function getActivityCategory(eventType: string): Exclude<ActivityCategory, "all"> {
  if (eventType === "class_created" || eventType === "class_joined") {
    return "classes"
  }

  if (
    eventType === "assignment_submitted" ||
    eventType === "quiz_submitted"
  ) {
    return "coursework"
  }

  if (eventType === "resource_uploaded") {
    return "resources"
  }

  return "teaching"
}
