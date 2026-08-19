"use server"

import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { onboardingState, user } from "@/db/schema"
import {
  ACCOUNT_SETUP_SCOPE,
  ONBOARDING_FLOW_VERSION,
  isUsableDisplayName,
  orgSetupScopeKey,
  type TeacherSetupStep,
} from "@/lib/onboarding/constants"
import { revalidatePath } from "next/cache"

type ActionResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export type OnboardingStateRow = {
  scopeKey: string
  currentStep: string | null
  completedSteps: string[]
  flowVersion: number
  metadata: Record<string, unknown>
  dismissedAt: Date | null
  completedAt: Date | null
}

async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function getOnboardingState(scopeKey: string): Promise<OnboardingStateRow | null> {
  const userId = await requireUserId()
  if (!userId) return null

  const [row] = await db
    .select({
      scopeKey: onboardingState.scopeKey,
      currentStep: onboardingState.currentStep,
      completedSteps: onboardingState.completedSteps,
      flowVersion: onboardingState.flowVersion,
      metadata: onboardingState.metadata,
      dismissedAt: onboardingState.dismissedAt,
      completedAt: onboardingState.completedAt,
    })
    .from(onboardingState)
    .where(and(eq(onboardingState.userId, userId), eq(onboardingState.scopeKey, scopeKey)))
    .limit(1)

  if (!row) return null

  return {
    scopeKey: row.scopeKey,
    currentStep: row.currentStep,
    completedSteps: row.completedSteps ?? [],
    flowVersion: row.flowVersion,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    dismissedAt: row.dismissedAt,
    completedAt: row.completedAt,
  }
}

export async function upsertOnboardingProgress(input: {
  scopeKey: string
  currentStep?: string | null
  completedSteps?: string[]
  metadata?: Record<string, unknown>
  markCompleted?: boolean
  markDismissed?: boolean
}): Promise<ActionResponse<OnboardingStateRow>> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  const existing = await getOnboardingState(input.scopeKey)
  const completedSteps = input.completedSteps ?? existing?.completedSteps ?? []
  const metadata = { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) }

  const values = {
    userId,
    scopeKey: input.scopeKey,
    currentStep: input.currentStep ?? existing?.currentStep ?? null,
    completedSteps,
    flowVersion: ONBOARDING_FLOW_VERSION,
    metadata,
    dismissedAt: input.markDismissed ? new Date() : existing?.dismissedAt ?? null,
    completedAt: input.markCompleted ? new Date() : existing?.completedAt ?? null,
  }

  if (existing) {
    await db
      .update(onboardingState)
      .set(values)
      .where(and(eq(onboardingState.userId, userId), eq(onboardingState.scopeKey, input.scopeKey)))
  } else {
    await db.insert(onboardingState).values({
      id: crypto.randomUUID(),
      ...values,
    })
  }

  const updated = await getOnboardingState(input.scopeKey)
  if (!updated) return { success: false, error: "Failed to save onboarding progress" }

  return { success: true, data: updated }
}

export async function completeTeacherSetupStep(input: {
  orgId: string
  step: TeacherSetupStep
  metadata?: Record<string, unknown>
}): Promise<ActionResponse<OnboardingStateRow>> {
  const scopeKey = orgSetupScopeKey(input.orgId)
  const existing = await getOnboardingState(scopeKey)
  const completedSteps = new Set(existing?.completedSteps ?? [])
  completedSteps.add(input.step)

  const isFinish = input.step === "finish"

  return upsertOnboardingProgress({
    scopeKey,
    currentStep: isFinish ? "finish" : input.step,
    completedSteps: Array.from(completedSteps),
    metadata: input.metadata,
    markCompleted: isFinish,
  })
}

export async function completeAccountSetup(data: { name: string }): Promise<ActionResponse> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  const name = data.name.trim()
  if (!isUsableDisplayName(name)) {
    return { success: false, error: "Enter a display name with at least 2 characters" }
  }

  try {
    await db.update(user).set({ name }).where(eq(user.id, userId))

    await upsertOnboardingProgress({
      scopeKey: ACCOUNT_SETUP_SCOPE,
      currentStep: "complete",
      completedSteps: ["display_name"],
      markCompleted: true,
    })

    revalidatePath("/org")
    return { success: true }
  } catch (error) {
    console.error("completeAccountSetup error", error)
    return { success: false, error: "Failed to update profile" }
  }
}

export async function needsAccountSetup(): Promise<boolean> {
  const userId = await requireUserId()
  if (!userId) return false

  const [row] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return !isUsableDisplayName(row?.name)
}
