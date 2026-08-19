/**
 * Action executor: the only place AI-proposed actions mutate the database.
 *
 * Runs on the `/api/ai/actions` route after the user confirms the
 * interactive card. Re-validates org membership, re-validates the payload
 * against the proposal schema, re-enforces teacher/owner role at execute
 * time, then delegates to the same feature modules the regular UI uses
 * (`app/actions/class-detail.ts`, `app/actions/quizzes.ts`,
 * `app/actions/messages.ts`) so notifications, activity logs and
 * revalidation stay consistent.
 */
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { aiActionProposals, classChannels } from "@/db/schema"
import { getOrganizationMembership } from "@/lib/org-validation"
import { createAnnouncement, createClasswork } from "@/app/actions/class-detail"
import { createQuiz } from "@/app/actions/quizzes"
import { sendChannelMessage } from "@/app/actions/messages"
import { getClassAccess } from "./executors"
import {
  ACTION_PROPOSAL_SCHEMAS,
  announcementProposalSchema,
  classworkProposalSchema,
  channelMessageProposalSchema,
  quizProposalSchema,
  type AiActionType,
  type AiActionProposal,
} from "./action-proposal-schemas"

export type AiActionExecutionResult =
  | {
      success: true
      action: AiActionType
      entityUrl: string
      message: string
    }
  | { success: false; error: string }

type StoredResult = {
  action: AiActionType
  entityUrl: string
  message: string
}

function classUrl(orgSlug: string, classId: string): string {
  return `/${orgSlug}/classes/${classId}`
}

function resolveError(result: { success: false; error: string } | { success: true }): string | null {
  return result.success ? null : result.error
}

function storedToResult(stored: StoredResult): AiActionExecutionResult {
  return { success: true, action: stored.action, entityUrl: stored.entityUrl, message: stored.message }
}

/**
 * Idempotency gate: a confirmed proposal carries a server-issued
 * `proposalId`. Completed proposals replay their stored result (never
 * creating a duplicate entity); failed proposals are re-executed and the
 * ledger updated.
 */
async function replayCompletedProposal(
  proposalId: string,
  orgId: string,
  userId: string,
): Promise<AiActionExecutionResult | null> {
  const [existing] = await db
    .select()
    .from(aiActionProposals)
    .where(eq(aiActionProposals.id, proposalId))
    .limit(1)
  if (!existing) return null
  if (existing.orgId !== orgId || existing.userId !== userId) {
    return { success: false, error: "You do not have access to this organization" }
  }
  if (existing.status === "completed" && existing.result) {
    return storedToResult(existing.result as StoredResult)
  }
  return null
}

async function upsertProposalLedger(input: {
  proposalId: string
  userId: string
  orgId: string
  proposal: AiActionProposal
  result: AiActionExecutionResult
  runId?: string
}): Promise<void> {
  try {
    await db
      .insert(aiActionProposals)
      .values({
        id: input.proposalId,
        runId: input.runId ?? null,
        userId: input.userId,
        orgId: input.orgId,
        action: input.proposal.action,
        payload: input.proposal.payload,
        status: input.result.success ? "completed" : "failed",
        result: input.result.success
          ? {
              action: input.result.action,
              entityUrl: input.result.entityUrl,
              message: input.result.message,
            }
          : null,
        errorMessage: input.result.success ? null : input.result.error,
      })
      .onConflictDoUpdate({
        target: aiActionProposals.id,
        set: {
          status: input.result.success ? "completed" : "failed",
          result: input.result.success
            ? {
                action: input.result.action,
                entityUrl: input.result.entityUrl,
                message: input.result.message,
              }
            : null,
          errorMessage: input.result.success ? null : input.result.error,
          updatedAt: new Date(),
        },
      })
  } catch (error) {
    console.error("[ai-actions] failed to persist proposal ledger:", error)
  }
}

export async function executeAiAction(
  userId: string,
  orgSlug: string,
  proposal: AiActionProposal,
  runId?: string,
): Promise<AiActionExecutionResult> {
  const membership = await getOrganizationMembership(userId, orgSlug)
  if (!membership) {
    return { success: false, error: "You do not have access to this organization" }
  }

  if (proposal.proposalId) {
    const replayed = await replayCompletedProposal(proposal.proposalId, membership.orgId, userId)
    if (replayed) return replayed
  }

  const ctx = {
    orgId: membership.orgId,
    orgSlug,
    userId,
    role: (membership.role === "owner" || membership.role === "admin" ? "teacher" : "student") as
      | "teacher"
      | "student",
  }

  const parsed = ACTION_PROPOSAL_SCHEMAS[proposal.action].safeParse(proposal.payload)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid action payload",
    }
  }

  const result = await runAction({
    proposal,
    payload: parsed.data as Record<string, unknown>,
    ctx,
    orgSlug,
  })

  if (proposal.proposalId) {
    await upsertProposalLedger({
      proposalId: proposal.proposalId,
      userId,
      orgId: membership.orgId,
      proposal,
      result,
      runId,
    })
  }

  return result
}

async function runAction(input: {
  proposal: AiActionProposal
  payload: Record<string, unknown>
  ctx: { orgId: string; orgSlug: string; userId: string; role: "teacher" | "student" }
  orgSlug: string
}): Promise<AiActionExecutionResult> {
  const { proposal, payload, ctx, orgSlug } = input

  try {
    switch (proposal.action) {
      case "create_announcement": {
        const data = announcementProposalSchema.parse(payload)
        const { classId, content } = data
        const access = await getClassAccess(ctx, classId)
        if (access === "none") {
          return { success: false, error: "Class not found or you are not a member" }
        }
        if (access === "student") {
          return { success: false, error: "Only teachers can create announcements" }
        }

        const formData = new FormData()
        formData.set("content", content)
        const error = resolveError(await createAnnouncement(classId, formData))
        if (error) return { success: false, error }

        return {
          success: true,
          action: "create_announcement",
          entityUrl: classUrl(orgSlug, classId),
          message: "Announcement posted",
        }
      }

      case "create_classwork": {
        const { classId, title, description, dueDate, points } =
          classworkProposalSchema.parse(payload)
        const access = await getClassAccess(ctx, classId)
        if (access === "none") {
          return { success: false, error: "Class not found or you are not a member" }
        }
        if (access === "student") {
          return { success: false, error: "Only teachers can create classwork" }
        }

        const formData = new FormData()
        formData.set("title", title)
        if (description) formData.set("description", description)
        formData.set("type", "assignment")
        if (dueDate) formData.set("dueDate", dueDate)
        if (points != null) formData.set("points", String(points))
        const error = resolveError(await createClasswork(classId, formData))
        if (error) return { success: false, error }

        return {
          success: true,
          action: "create_classwork",
          entityUrl: `${classUrl(orgSlug, classId)}#classwork`,
          message: `Assignment "${title}" created`,
        }
      }

      case "create_quiz": {
        const { classId, title, description, questions } = quizProposalSchema.parse(payload)
        const access = await getClassAccess(ctx, classId)
        if (access === "none") {
          return { success: false, error: "Class not found or you are not a member" }
        }
        if (access === "student") {
          return { success: false, error: "Only teachers can create quizzes" }
        }

        const formData = new FormData()
        formData.set(
          "payload",
          JSON.stringify({
            title,
            description,
            dueDate: null,
            status: "draft",
            timeLimitSeconds: null,
            questions: questions.map((question, index) => ({ ...question, order: index })),
          }),
        )
        const error = resolveError(await createQuiz(classId, formData))
        if (error) return { success: false, error }

        return {
          success: true,
          action: "create_quiz",
          entityUrl: `${classUrl(orgSlug, classId)}#quizzes`,
          message: `Quiz "${title}" created as a draft`,
        }
      }

      case "create_channel_message": {
        const { channelId, content } = channelMessageProposalSchema.parse(payload)
        const [channel] = await db
          .select({ classId: classChannels.classId })
          .from(classChannels)
          .where(eq(classChannels.id, channelId))
          .limit(1)
        if (!channel) return { success: false, error: "Channel not found" }

        const access = await getClassAccess(ctx, channel.classId)
        if (access === "none") {
          return { success: false, error: "Class not found or you are not a member" }
        }
        if (access === "student") {
          return { success: false, error: "Only teachers can post class messages" }
        }

        const error = resolveError(await sendChannelMessage(channelId, content))
        if (error) return { success: false, error }

        return {
          success: true,
          action: "create_channel_message",
          entityUrl: classUrl(orgSlug, channel.classId),
          message: "Message posted to the class channel",
        }
      }
    }
  } catch (error) {
    console.error("[ai-actions] runAction failed:", error)
    return { success: false, error: "Failed to execute the action" }
  }
}