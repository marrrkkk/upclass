/**
 * Action tools: draft-only, non-mutating.
 *
 * Every action tool verifies the target class/channel access first, then
 * returns an `[ACTION_PROPOSAL]` payload the UI renders as an interactive
 * confirmation card. Mutations only happen after the user confirms
 * (see `executeAiAction`).
 */
import { tool, type Tool } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { classChannels } from "@/db/schema"
import { logToolEvent } from "@/lib/ai/token-logger"
import type { AiToolExecutionContext } from "@/lib/ai/types"
import { getClassAccess } from "./executors"
import {
  actionProposalMarkup,
  generatedQuestionSchema,
} from "./action-proposal-schemas"

const CONFIRMATION_SUFFIX =
  " The tool output renders as an interactive confirmation card — do not write any [ACTION_PROPOSAL] text manually."

async function requireTeacher(
  ctx: AiToolExecutionContext,
  classId: string,
): Promise<string | null> {
  const access = await getClassAccess(ctx, classId)
  if (access === "none") return "Class not found or you are not a member."
  if (access === "student") return "Only teachers can perform this action."
  return null
}

/** Fresh idempotency key per proposal; replayed confirmations return the
 * original result instead of creating another entity. */
function newProposalId(): string {
  return crypto.randomUUID()
}

export function buildActionTools(ctx: AiToolExecutionContext) {
  const tools: Record<string, Tool> = {
    draft_announcement: tool({
      description: `Draft a class announcement the teacher can publish. Use when the user wants to announce something to a class.` + CONFIRMATION_SUFFIX,
      inputSchema: z.object({
        classId: z.string().min(1).describe("The class to announce to"),
        content: z.string().min(1).max(2_000).describe("Announcement content"),
      }),
      execute: async ({ classId, content }) => {
        const error = await requireTeacher(ctx, classId)
        if (error) return `Error: ${error}`
        return actionProposalMarkup(
          "create_announcement",
          { classId, content: content.trim() },
          newProposalId(),
        )
      },
    }),

    create_assignment: tool({
      description: `Draft a class assignment the teacher can publish. Use when the user wants to create or assign classwork with a title, optional instructions, optional due date and optional points.` + CONFIRMATION_SUFFIX,
      inputSchema: z.object({
        classId: z.string().min(1).describe("The class to add the assignment to"),
        title: z.string().min(1).max(160).describe("Assignment title"),
        description: z
          .string()
          .max(4_000)
          .optional()
          .describe("Assignment instructions"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date as YYYY-MM-DD (or 'today' / 'tomorrow')"),
        points: z.coerce.number().finite().min(0).max(1_000).optional().describe("Total points"),
      }),
      execute: async ({ classId, title, description, dueDate, points }) => {
        const error = await requireTeacher(ctx, classId)
        if (error) return `Error: ${error}`
        return actionProposalMarkup(
          "create_classwork",
          {
            classId,
            title: title.trim(),
            description: (description ?? "").trim(),
            dueDate: dueDate ?? undefined,
            points,
          },
          newProposalId(),
        )
      },
    }),

    draft_quiz: tool({
      description: `Draft a quiz the teacher can publish. Use when the user wants to create a quiz for a class. Produce between 3 and 10 questions unless the user specifies another count; choice questions need 2-6 options with exactly one correct option for single_choice and at least one for multiple_select; true_false may omit options; short_answer has no options.` + CONFIRMATION_SUFFIX,
      inputSchema: z.object({
        classId: z.string().min(1).describe("The class to add the quiz to"),
        title: z.string().min(1).max(160).describe("Quiz title"),
        description: z.string().max(1_000).optional().describe("Quiz description"),
        questions: z
          .array(generatedQuestionSchema)
          .min(1)
          .max(20)
          .describe("Quiz questions"),
      }),
      execute: async ({ classId, title, description, questions }) => {
        const error = await requireTeacher(ctx, classId)
        if (error) return `Error: ${error}`
        return actionProposalMarkup(
          "create_quiz",
          {
            classId,
            title: title.trim(),
            description: (description ?? "").trim(),
            questions,
          },
          newProposalId(),
        )
      },
    }),

    post_class_message: tool({
      description: `Post a message to a class channel the teacher can confirm. Use when the user wants to message a class channel.` + CONFIRMATION_SUFFIX,
      inputSchema: z.object({
        channelId: z.string().min(1).describe("The class channel to post to"),
        content: z.string().min(1).max(2_000).describe("Message content"),
      }),
      execute: async ({ channelId, content }) => {
        const [channel] = await db
          .select({ classId: classChannels.classId })
          .from(classChannels)
          .where(eq(classChannels.id, channelId))
          .limit(1)
        if (!channel) return "Error: Channel not found."
        const error = await requireTeacher(ctx, channel.classId)
        if (error) return `Error: ${error}`
        return actionProposalMarkup(
          "create_channel_message",
          {
            channelId,
            content: content.trim(),
          },
          newProposalId(),
        )
      },
    }),
  }

  // Tool-event metrics (invocation, success, latency) for the eval loop.
  for (const [name, definition] of Object.entries(tools)) {
    const execute = definition.execute
    definition.execute = async (input, options) => {
      const startedAt = Date.now()
      try {
        const output = await execute?.(input, options)
        void logToolEvent({
          runId: ctx.runId,
          messageId: ctx.messageId,
          userId: ctx.userId,
          orgId: ctx.orgId,
          toolName: name,
          success: true,
          emptyResult: typeof output === "string" && output.trim().length === 0,
          latencyMs: Date.now() - startedAt,
        }).catch(() => {})
        return output
      } catch (error) {
        void logToolEvent({
          runId: ctx.runId,
          messageId: ctx.messageId,
          userId: ctx.userId,
          orgId: ctx.orgId,
          toolName: name,
          success: false,
          latencyMs: Date.now() - startedAt,
        }).catch(() => {})
        throw error
      }
    }
  }

  return tools
}