/**
 * Hashed security-event logging for the AI assistant.
 *
 * Only the sha256 hash of raw input is ever persisted — never the input
 * itself. All logging is fire-and-forget and never throws.
 */
import { createHash } from "node:crypto"

import { db } from "@/db"
import { aiSecurityEvents, type aiSecurityEventType } from "@/db/schema"

export type AiSecurityEventType = (typeof aiSecurityEventType.enumValues)[number]

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex")
}

export type LogAiSecurityEventInput = {
  eventType: AiSecurityEventType
  patternMatched?: string | null
  userId?: string | null
  orgId?: string | null
  rawInput?: string | null
}

/** Insert a hashed security event. Fire-and-forget; never throws. */
export async function logAiSecurityEvent(input: LogAiSecurityEventInput): Promise<void> {
  try {
    await db.insert(aiSecurityEvents).values({
      id: crypto.randomUUID(),
      eventType: input.eventType,
      patternMatched: input.patternMatched ?? null,
      userId: input.userId ?? null,
      orgId: input.orgId ?? null,
      inputHash: input.rawInput ? sha256Hex(input.rawInput) : null,
    })
  } catch (error) {
    console.error("[ai-security] failed to persist security event:", error)
  }
}