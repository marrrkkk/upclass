import { sql } from "drizzle-orm"

import { db } from "@/db"
import { resourceAiRateLimits } from "@/db/schema"

const BURST_WINDOW_MS = 60_000
const MAX_BURST_PER_WINDOW = 10
const MAX_BURST_BUCKETS = 10_000

const DAILY_LIMITS: Record<string, number> = {
  chat: 200,
  quiz: 20,
  learn: 20,
}

type BurstBucket = { windowStart: number; count: number }

const burstBuckets = new Map<string, BurstBucket>()

function getDay() {
  return new Date().toISOString().slice(0, 10)
}

function pruneBurstBuckets(now: number) {
  if (burstBuckets.size < MAX_BURST_BUCKETS) return
  for (const [key, bucket] of burstBuckets) {
    if (now - bucket.windowStart >= BURST_WINDOW_MS) {
      burstBuckets.delete(key)
    }
  }
}

function checkAIBurst(userId: string, scope: string): boolean {
  const now = Date.now()
  const key = `${scope}:${userId}`
  const bucket = burstBuckets.get(key)

  if (!bucket || now - bucket.windowStart >= BURST_WINDOW_MS) {
    pruneBurstBuckets(now)
    burstBuckets.set(key, { windowStart: now, count: 1 })
    return true
  }

  bucket.count += 1
  return bucket.count <= MAX_BURST_PER_WINDOW
}

async function consumeAIDailyAllowance(userId: string, scope: string): Promise<number> {
  const [row] = await db
    .insert(resourceAiRateLimits)
    .values({ userId, scope, day: getDay(), count: 1 })
    .onConflictDoUpdate({
      target: [resourceAiRateLimits.userId, resourceAiRateLimits.scope, resourceAiRateLimits.day],
      set: { count: sql`${resourceAiRateLimits.count} + 1` },
    })
    .returning({ count: resourceAiRateLimits.count })

  return row?.count ?? 1
}

export async function enforceAIRateLimit(
  userId: string,
  scope: string,
): Promise<{ allowed: boolean; dailyLimit: number }> {
  const dailyLimit = DAILY_LIMITS[scope] ?? 20

  if (!checkAIBurst(userId, scope)) {
    return { allowed: false, dailyLimit }
  }

  const count = await consumeAIDailyAllowance(userId, scope)
  return { allowed: count <= dailyLimit, dailyLimit }
}
