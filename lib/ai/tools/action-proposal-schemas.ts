/**
 * Action proposal schemas + markup.
 *
 * The assistant's action tools never mutate the database. They return a
 * `[ACTION_PROPOSAL]{json}[/ACTION_PROPOSAL]` payload that the UI renders
 * as an interactive confirmation card; the user confirms, and the client
 * calls `executeAiAction` (route + executor) which re-validates and
 * delegates to the same feature modules the regular UI uses.
 */
import { z } from "zod"

import type { AiGeneratedQuiz } from "@/lib/quiz-ai"

export const ACTION_TYPES = [
  "create_announcement",
  "create_classwork",
  "create_quiz",
  "create_channel_message",
] as const

export type AiActionType = (typeof ACTION_TYPES)[number]

export type AiActionProposal = {
  action: AiActionType
  payload: Record<string, unknown>
  /**
   * Durable idempotency key issued server-side when the action tool creates
   * the proposal. The confirmation request echoes it back so re-confirming
   * (browser retry, double-click, network replay) never creates a duplicate.
   */
  proposalId?: string
}

/* -------------------------------------------------------------------------- */
/* Quiz generation schema (shared with /api/ai/quizzes/generate)               */
/* -------------------------------------------------------------------------- */

export const generatedQuestionSchema = z.object({
  prompt: z.string().trim().min(1, "Each generated question needs a prompt").max(1_000),
  type: z.enum(["single_choice", "multiple_select", "true_false", "short_answer"]),
  points: z.coerce.number().finite().min(1).max(100).default(1),
  options: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
        isCorrect: z.boolean(),
      }),
    )
    .max(6)
    .default([]),
})

export const generatedQuizSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1_000).default(""),
  questions: z.array(generatedQuestionSchema).min(1).max(20),
})

export function normalizeGeneratedQuiz(data: z.infer<typeof generatedQuizSchema>): AiGeneratedQuiz {
  return {
    title: data.title,
    description: data.description,
    questions: data.questions.map((question) => {
      if (question.type === "short_answer") {
        return { ...question, options: [] }
      }

      if (question.type === "true_false") {
        const falseIsCorrect = question.options.some(
          (option) => option.isCorrect && option.text.toLowerCase() === "false",
        )
        return {
          ...question,
          options: [
            { text: "True", isCorrect: !falseIsCorrect },
            { text: "False", isCorrect: falseIsCorrect },
          ],
        }
      }

      if (question.options.length < 2) {
        throw new Error("Each choice question needs at least two options")
      }

      if (question.type === "single_choice") {
        const firstCorrect = question.options.findIndex((option) => option.isCorrect)
        return {
          ...question,
          options: question.options.map((option, index) => ({
            ...option,
            isCorrect: index === (firstCorrect >= 0 ? firstCorrect : 0),
          })),
        }
      }

      if (!question.options.some((option) => option.isCorrect)) {
        throw new Error("Each multiple-select question needs a correct option")
      }

      return question
    }),
  }
}

/* -------------------------------------------------------------------------- */
/* Proposal schemas (validated again at execute time)                          */
/* -------------------------------------------------------------------------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const US_DATE_RE = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T/

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/**
 * Best-effort due-date normalization for LLM output: accepts `YYYY-MM-DD`,
 * ISO datetimes, `MM/DD/YYYY` and the keywords `today` / `tomorrow`.
 * Returns `undefined` when the value can't be normalized (no due date).
 */
export function normalizeDueDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (DATE_RE.test(trimmed)) return trimmed
  if (ISO_DATETIME_RE.test(trimmed)) return trimmed.slice(0, 10)

  const us = trimmed.match(US_DATE_RE)
  if (us) return `${us[3]}-${pad(Number(us[1]))}-${pad(Number(us[2]))}`

  const lower = trimmed.toLowerCase()
  if (lower === "today") return new Date().toISOString().slice(0, 10)
  if (lower === "tomorrow") return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  return undefined
}

export const announcementProposalSchema = z.object({
  classId: z.string().trim().min(1, "A class is required"),
  content: z.string().trim().min(1, "Announcement content is required").max(2_000),
})

export const classworkProposalSchema = z.object({
  classId: z.string().trim().min(1, "A class is required"),
  title: z.string().trim().min(1, "A title is required").max(160),
  description: z.string().trim().max(4_000).optional().default(""),
  dueDate: z.preprocess(normalizeDueDate, z.string().optional()),
  points: z.coerce.number().finite().min(0).max(1_000).optional(),
})

export const quizProposalSchema = z.object({
  classId: z.string().trim().min(1, "A class is required"),
  title: z.string().trim().min(1, "A quiz title is required").max(160),
  description: z.string().trim().max(1_000).optional().default(""),
  questions: z.array(generatedQuestionSchema).min(1).max(20),
})

export const channelMessageProposalSchema = z.object({
  channelId: z.string().trim().min(1, "A channel is required"),
  content: z.string().trim().min(1, "Message content is required").max(2_000),
})

export const ACTION_PROPOSAL_SCHEMAS: Record<AiActionType, z.ZodType> = {
  create_announcement: announcementProposalSchema,
  create_classwork: classworkProposalSchema,
  create_quiz: quizProposalSchema,
  create_channel_message: channelMessageProposalSchema,
}

/* -------------------------------------------------------------------------- */
/* Markup helpers (shared with the UI)                                         */
/* -------------------------------------------------------------------------- */

export function actionProposalMarkup(
  action: AiActionType,
  payload: Record<string, unknown>,
  proposalId?: string,
): string {
  return `[ACTION_PROPOSAL]${JSON.stringify({ action, payload, proposalId })}[/ACTION_PROPOSAL]`
}

const PROPOSAL_OPENER = "[ACTION_PROPOSAL]"
const PROPOSAL_CLOSER = "[/ACTION_PROPOSAL]"

/**
 * Parse proposals from model output. Tolerant by design: for each segment
 * between closers, only the LAST opener before the JSON is used, so stray
 * text or a malformed proposal never swallows the valid one next to it.
 */
export function parseActionProposals(text: string): AiActionProposal[] {
  const proposals: AiActionProposal[] = []
  for (const segment of text.split(PROPOSAL_CLOSER)) {
    const opener = segment.lastIndexOf(PROPOSAL_OPENER)
    if (opener === -1) continue
    const raw = segment.slice(opener + PROPOSAL_OPENER.length)
    try {
      const parsed = JSON.parse(raw) as AiActionProposal
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.action === "string" &&
        parsed.payload &&
        typeof parsed.payload === "object"
      ) {
        proposals.push({
          action: parsed.action as AiActionType,
          payload: parsed.payload as Record<string, unknown>,
          proposalId:
            typeof parsed.proposalId === "string" && parsed.proposalId.length > 0
              ? parsed.proposalId
              : undefined,
        })
      }
    } catch {
      // Malformed proposal — ignore it; the model will self-correct.
    }
  }
  return proposals
}