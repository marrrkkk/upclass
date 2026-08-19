/**
 * Request deduplication for assistant turns (double-submit protection).
 * 10s TTL on `{conversationId}:{message}` hashes. Fail open.
 */
import { cacheSetIfAbsent } from "@/lib/ai/cache-layer"
import { sha256Hex } from "@/lib/ai/security/security-events"

const DEDUP_TTL_SECONDS = 10

export async function checkDuplicate(
  conversationId: string,
  message: string,
): Promise<{ duplicate: boolean }> {
  try {
    const key = `dedup:${sha256Hex(`${conversationId}:${message}`)}`
    const inserted = await cacheSetIfAbsent(key, 1, DEDUP_TTL_SECONDS)
    return { duplicate: !inserted }
  } catch (error) {
    console.warn("[ai-dedup] dedup check failed, allowing request:", error)
    return { duplicate: false }
  }
}