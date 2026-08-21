/**
 * Structured outputs for the assistant read tools.
 *
 * Seven read tools return a machine-readable card alongside their text
 * summary. Cards are persisted on the assistant message row
 * (`metadata.structuredOutputs`) and rendered by the UI; the model only
 * ever sees the text summary.
 */
import type { ExecutorOutput } from "./executors"

export type ClassesListCard = {
  _type: "classes_list"
  title: string
  items: Array<{
    id: string
    title: string
    description: string | null
    category: string | null
    code: string | null
    color: string | null
    schedule: string | null
    createdAt: string
    url: string
  }>
}

export type ClassDetailsCard = {
  _type: "class_details"
  title: string
  items: Array<{
    id: string
    title: string
    description: string | null
    category: string | null
    code: string | null
    color: string | null
    schedule: string | null
    memberCount: number
    teachers: string
    createdAt: string
    url: string
  }>
}

export type ClassworkListCard = {
  _type: "classwork_list"
  title: string
  items: Array<{
    id: string
    title: string
    description: string | null
    type: "assignment" | "quiz" | "material"
    dueDate: string
    points: string | null
    createdAt: string
    url: string
  }>
}

export type QuizzesListCard = {
  _type: "quizzes_list"
  title: string
  items: Array<{
    id: string
    title: string
    description: string | null
    status: "draft" | "published"
    dueDate: string
    totalPoints: string | null
    createdAt: string
    url: string
  }>
}

export type QuizDetailsCard = {
  _type: "quiz_details"
  title: string
  items: Array<{
    id: string
    title: string
    description: string | null
    status: "draft" | "published"
    dueDate: string
    timeLimitSeconds: string | null
    totalPoints: string | null
    questionCount: number
    questions: Array<{
      id: string
      prompt: string
      type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
      points: string
      options: Array<{ id: string; text: string; isCorrect?: boolean }>
    }>
    url: string
  }>
}

export type ResourcesListCard = {
  _type: "resources_list"
  title: string
  items: Array<{
    id: string
    title: string
    description: string | null
    category: string | null
    fileType: string | null
    fileName: string
    createdAt: string
    url: string
  }>
}

export type StudentOverviewCard = {
  _type: "student_overview"
  title: string
  items: Array<{
    studentId: string
    studentName: string
    classId: string
    submissionCount: number
    gradedCount: number
    quizAttempts: number
    averageGrade: number | null
  }>
}

export type StructuredCard =
  | ClassesListCard
  | ClassDetailsCard
  | ClassworkListCard
  | QuizzesListCard
  | QuizDetailsCard
  | ResourcesListCard
  | StudentOverviewCard

const STRUCTURED_CARD_TYPES = new Set<string>([
  "classes_list",
  "class_details",
  "classwork_list",
  "quizzes_list",
  "quiz_details",
  "resources_list",
  "student_overview",
])

/** Loose shape guard for card payloads coming off the DB / tool output. */
export function isStructuredCard(value: unknown): value is StructuredCard {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate._type === "string" &&
    STRUCTURED_CARD_TYPES.has(candidate._type) &&
    Array.isArray(candidate.items)
  )
}

/** Extracts the structured card (if any) from an executor output. */
export function structuredCardFromOutput(output: ExecutorOutput): StructuredCard | null {
  if (!isStructuredCard(output.structured)) return null
  return output.structured
}