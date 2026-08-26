/**
 * Weekly study-plan generation: builds privacy-safe aggregates from the
 * student's own SRS state, review history, and class deadlines, then asks the
 * model for a short actionable plan. Nothing student-authored beyond counts,
 * titles, and accuracies leaves the database.
 */
import { z } from "zod"

export const studyPlanSchema = z.object({
  summary: z.string().min(5).max(400),
  focusAreas: z.array(z.string().min(2).max(120)).max(4).default([]),
  days: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        items: z.array(z.string().min(2).max(200)).max(4),
      }),
    )
    .min(1)
    .max(7),
})

export type StudySpaceFact = {
  title: string
  totalCards: number
  dueNext7Days: number
  accuracy14d: number | null
}

export type DeadlineFact = {
  title: string
  className: string
  dueInDays: number
}

export type StudyPlanFacts = {
  firstName: string
  spaces: StudySpaceFact[]
  deadlines: DeadlineFact[]
}

export function buildStudyPlanPrompt(facts: StudyPlanFacts): string {
  const spaces = facts.spaces.length
    ? facts.spaces
        .map((space) => {
          const accuracy =
            space.accuracy14d === null ? "no reviews yet" : `${Math.round(space.accuracy14d * 100)}% correct recently`
          return `- ${space.title}: ${space.totalCards} cards, ${space.dueNext7Days} due this week, ${accuracy}`
        })
        .join("\n")
    : "- No study spaces yet"
  const deadlines = facts.deadlines.length
    ? facts.deadlines.map((deadline) => `- "${deadline.title}" (${deadline.className}) due in ${deadline.dueInDays} day(s)`).join("\n")
    : "- None within two weeks"

  return `Create a realistic 7-day study plan for ${facts.firstName}. Aggregates below are trusted context about their own data. Prefer concrete actions ("review 15 due cards in X") over vague advice; schedule the weakest topics first and leave buffer before each deadline. Return JSON only:
{"summary":"one encouraging sentence","focusAreas":["up to 4"],"days":[{"label":"Mon","items":["1-3 tasks"]}]}

STUDY SPACES
${spaces}

UPCOMING DEADLINES
${deadlines}`
}
