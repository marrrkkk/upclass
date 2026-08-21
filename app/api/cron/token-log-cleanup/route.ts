import { NextRequest, NextResponse } from "next/server"
import { inArray, lt } from "drizzle-orm"

import { db } from "@/db"
import { aiTokenLogs } from "@/db/schema"
import {
  TOKEN_LOG_BATCH_SIZE,
  TOKEN_LOG_RETENTION_DAYS,
} from "@/lib/ai/token-logger"

export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization")
  return header === `Bearer ${secret}`
}

/**
 * Cron: purge token-log rows older than the retention window, in batches.
 * Runs daily at 03:00 UTC (see vercel.json). GET matches the Vercel cron
 * convention; POST is accepted for flexibility.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return cleanupTokenLogs()
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return cleanupTokenLogs()
}

async function cleanupTokenLogs() {
  const cutoff = new Date(Date.now() - TOKEN_LOG_RETENTION_DAYS * 86_400_000)
  let deleted = 0

  try {
    for (let batch = 0; batch < 50; batch += 1) {
      const rows = await db
        .select({ id: aiTokenLogs.id })
        .from(aiTokenLogs)
        .where(lt(aiTokenLogs.createdAt, cutoff))
        .limit(TOKEN_LOG_BATCH_SIZE)

      if (rows.length === 0) break

      const ids = rows.map((row) => row.id)
      await db.delete(aiTokenLogs).where(inArray(aiTokenLogs.id, ids))
      deleted += ids.length
    }

    return NextResponse.json({ success: true, deleted, cutoff: cutoff.toISOString() })
  } catch (error) {
    console.error("[cron] token log cleanup failed:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}