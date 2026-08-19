/**
 * Per-user / per-org usage metering with weighted credits.
 *
 * Quotas are flat and env-configurable (`AI_MONTHLY_CREDIT_LIMIT`); there is
 * no plan-tier system in UpClass. Both the user-level and org-level monthly
 * sums must stay under the limit (dual-scope).
 */
import { and, eq, gte, sql } from "drizzle-orm"

import { db } from "@/db"
import { aiUsageEvents } from "@/db/schema"
import { cacheDelete, cacheGet, cacheIncrement, cacheSetIfAbsent } from "@/lib/ai/cache-layer"

export const TASK_WEIGHTS: Record<string, number> = {
  assistant_message: 1,
  assistant_tool_call: 1,
  intent_classification: 1,
  conversation_summary: 1,
  quiz_generation: 3,
  resource_chat: 1,
}

const DEFAULT_MONTHLY_CREDIT_LIMIT = 500
const USAGE_SUM_CACHE_TTL = 60
const COOLDOWN_SECONDS = 3

export function getMonthlyCreditLimit(): number {
  const raw = Number(process.env.AI_MONTHLY_CREDIT_LIMIT)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MONTHLY_CREDIT_LIMIT
}

/** UTC `YYYY-MM` key for the current usage month. */
export function getUtcMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

function getMonthStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

async function getDbMonthlySum(
  scope: "user" | "org",
  scopeId: string,
): Promise<number> {
  const column = scope === "user" ? aiUsageEvents.userId : aiUsageEvents.orgId
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${aiUsageEvents.weight}), 0)::int`.as("total") })
    .from(aiUsageEvents)
    .where(and(eq(column, scopeId), gte(aiUsageEvents.createdAt, getMonthStart())))
  return Number(row?.total ?? 0)
}

/** Monthly credit sum for a scope, cache-first (60s TTL) with DB fallback. */
export async function getMonthlyUsage(
  scope: "user" | "org",
  scopeId: string,
): Promise<number> {
  const monthKey = getUtcMonthKey()
  const cacheKey = `usage:${monthKey}:${scope}:${scopeId}`

  const cached = await cacheGet(cacheKey)
  if (cached !== null) {
    const parsed = Number(cached)
    if (Number.isFinite(parsed)) return parsed
  }

  const sum = await getDbMonthlySum(scope, scopeId)
  await cacheSetIfAbsent(cacheKey, sum, USAGE_SUM_CACHE_TTL)
  return sum
}

export type UsageCheckResult =
  | { allowed: true; usage: { user: number; org: number }; limit: number }
  | { allowed: false; reason: "cooldown" | "quota"; usage: { user: number; org: number }; limit: number }

/**
 * Check the usage limit for a task. Optional per-user+task cooldown (default
 * 3s) rejects without deducting credits. Both user and org monthly sums must
 * be under the limit.
 */
export async function checkUsageLimit(
  userId: string,
  orgId: string,
  taskType: string,
  options: { cooldownSeconds?: number } = {},
): Promise<UsageCheckResult> {
  const cooldownSeconds = options.cooldownSeconds ?? COOLDOWN_SECONDS

  if (cooldownSeconds > 0) {
    const cooldownKey = `cd:${userId}:${taskType}`
    const acquired = await cacheSetIfAbsent(cooldownKey, 1, cooldownSeconds)
    if (!acquired) {
      return {
        allowed: false,
        reason: "cooldown",
        usage: { user: 0, org: 0 },
        limit: getMonthlyCreditLimit(),
      }
    }
  }

  const [userUsage, orgUsage] = await Promise.all([
    getMonthlyUsage("user", userId),
    getMonthlyUsage("org", orgId),
  ])
  const limit = getMonthlyCreditLimit()

  if (userUsage >= limit || orgUsage >= limit) {
    return { allowed: false, reason: "quota", usage: { user: userUsage, org: orgUsage }, limit }
  }

  return { allowed: true, usage: { user: userUsage, org: orgUsage }, limit }
}

/**
 * Record weighted usage: insert the event and bump both cached counters.
 * On cache failure the cached keys are deleted so the next read falls back to
 * a DB sum. Never throws.
 */
export async function recordUsage(
  userId: string,
  orgId: string,
  taskType: string,
  weight?: number,
  runId?: string,
): Promise<void> {
  const eventWeight = weight ?? TASK_WEIGHTS[taskType] ?? 1
  const monthKey = getUtcMonthKey()

  try {
    await db.insert(aiUsageEvents).values({
      id: crypto.randomUUID(),
      userId,
      orgId,
      taskType,
      weight: eventWeight,
      runId: runId ?? null,
    })
  } catch (error) {
    console.error("[ai-usage] failed to record usage event:", error)
  }

  const [userResult, orgResult] = await Promise.allSettled([
    cacheIncrement(`usage:${monthKey}:user:${userId}`, USAGE_SUM_CACHE_TTL),
    cacheIncrement(`usage:${monthKey}:org:${orgId}`, USAGE_SUM_CACHE_TTL),
  ])

  if (userResult.status === "rejected") {
    await cacheDelete(`usage:${monthKey}:user:${userId}`)
  }
  if (orgResult.status === "rejected") {
    await cacheDelete(`usage:${monthKey}:org:${orgId}`)
  }
}