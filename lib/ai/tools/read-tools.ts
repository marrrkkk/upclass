/**
 * Read tools: AI SDK `tool()` definitions wrapping the executors.
 *
 * Structured tools return `{ text, structured }` so the route can persist
 * the card for the UI; the model only reads the text. Errors never throw —
 * executors return "Error: …" strings the model can recover from.
 */
import { tool, type Tool } from "ai"
import { z } from "zod"

import { logToolEvent } from "@/lib/ai/token-logger"
import type { AiToolExecutionContext } from "@/lib/ai/types"
import {
  ALL_EXECUTORS,
  type ExecutorOutput,
  type ReadExecutorName,
} from "./executors"
import { READ_TOOL_METADATA, STRUCTURED_TOOL_NAMES } from "./tool-metadata"

type ExecutorFn = (ctx: AiToolExecutionContext, input: never) => Promise<ExecutorOutput>

const INPUT_SCHEMAS: Partial<Record<ReadExecutorName, z.ZodType>> = {
  get_org_stats: z.object({}),
  get_recent_activity: z.object({ limit: z.number().int().min(1).max(25).optional() }),
  search_classes: z.object({
    query: z.string().min(1).max(120),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  unified_search: z.object({
    query: z.string().min(1).max(200),
    types: z.array(z.enum(["class", "classwork", "resource", "announcement"])).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  list_classes: z.object({ limit: z.number().int().min(1).max(25).optional() }),
  get_class_details: z.object({ classId: z.string().min(1) }),
  get_class_roster: z.object({
    classId: z.string().min(1),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_class_schedule: z.object({ classId: z.string().min(1) }),
  list_classwork: z.object({
    classId: z.string().min(1),
    type: z.enum(["assignment", "quiz", "material"]).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_classwork_details: z.object({ classworkId: z.string().min(1) }),
  get_ungraded_submissions: z.object({
    classId: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_submission_details: z.object({ submissionId: z.string().min(1) }),
  list_quizzes: z.object({
    classId: z.string().min(1),
    status: z.enum(["draft", "published"]).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_quiz_details: z.object({ quizId: z.string().min(1) }),
  get_quiz_results: z.object({
    quizId: z.string().min(1),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_student_overview: z.object({
    classId: z.string().min(1),
    studentId: z.string().min(1).optional(),
  }),
  list_resources: z.object({ limit: z.number().int().min(1).max(25).optional() }),
  get_resource_details: z.object({ resourceId: z.string().min(1) }),
  search_resources: z.object({
    query: z.string().min(1).max(120),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  search_resource_content: z.object({
    resourceId: z.string().min(1),
    query: z.string().min(1).max(200),
  }),
  get_upcoming_work: z.object({
    classId: z.string().min(1).optional(),
    days: z.number().int().min(1).max(30).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_study_summary: z.object({
    classId: z.string().min(1).optional(),
    focusAreas: z.array(z.string()).optional(),
  }),
  get_recent_context: z.object({
    classId: z.string().min(1).optional(),
    hours: z.number().int().min(1).max(168).optional(),
  }),
  get_announcements: z.object({
    classId: z.string().min(1),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_channel_messages: z.object({
    channelId: z.string().min(1),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  get_org_knowledge: z.object({
    query: z.string().min(1).max(300),
    limit: z.number().int().min(1).max(10).optional(),
  }),
}

export function buildReadTools(ctx: AiToolExecutionContext): Record<string, Tool> {
  const tools: Record<string, Tool> = {}

  for (const [name, meta] of Object.entries(READ_TOOL_METADATA)) {
    const inputSchema = INPUT_SCHEMAS[name as ReadExecutorName]
    if (!inputSchema) continue

    const executor = ALL_EXECUTORS[name] as ExecutorFn | undefined
    if (!executor) continue

    const isStructured = STRUCTURED_TOOL_NAMES.has(name)

    tools[name] = tool({
      description: meta.description,
      inputSchema,
      execute: async (input: unknown) => {
        const startedAt = Date.now()
        try {
          const output = await executor(ctx, input as never)
          const structured = output.structured as { items?: unknown[] } | undefined
          const emptyResult =
            output.text.trim().length === 0 ||
            (structured !== undefined && (structured.items?.length ?? 0) === 0)
          void logToolEvent({
            runId: ctx.runId,
            messageId: ctx.messageId,
            userId: ctx.userId,
            orgId: ctx.orgId,
            toolName: name,
            success: true,
            emptyResult,
            latencyMs: Date.now() - startedAt,
          }).catch(() => {})
          return isStructured ? output : output.text
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
          console.error(`[ai-tools] ${name} failed:`, error)
          return "Error: The tool failed unexpectedly. Try a different approach."
        }
      },
    })
  }

  return tools
}

export function getReadToolNames(): string[] {
  return Object.keys(READ_TOOL_METADATA)
}