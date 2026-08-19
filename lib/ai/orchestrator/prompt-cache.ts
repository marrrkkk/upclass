/**
 * Tiny LRU cache for the STATIC part of assembled system prompts.
 *
 * Only deterministic, stable prompt modules (base modules, tool list, user
 * context) are cached. Dynamic content (org memories, conversation
 * summaries, surface context, canary token) is NEVER cached — it is appended
 * per request so edited memories or refreshed summaries can never be served
 * stale. The canary token is always built per request.
 */
export const PROMPT_CACHE_MAX_ENTRIES = 50
export const PROMPT_CACHE_VERSION = "v2"

export class PromptCache {
  private readonly max: number
  private readonly entries = new Map<string, string>()

  constructor(max = PROMPT_CACHE_MAX_ENTRIES) {
    this.max = max
  }

  get(key: string): string | undefined {
    const value = this.entries.get(key)
    if (value === undefined) return undefined
    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }

  put(key: string, value: string): void {
    if (this.entries.has(key)) this.entries.delete(key)
    this.entries.set(key, value)
    if (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
  }

  clear(): void {
    this.entries.clear()
  }

  get size(): number {
    return this.entries.size
  }
}

export const promptCache = new PromptCache()

/**
 * Cache key over STATIC prompt inputs only. Memory count, summary presence,
 * and message content are deliberately excluded: anything dynamic must never
 * share a cache slot, because the cached value cannot change with it.
 */
export function promptCacheKey(params: {
  orgId: string
  role: string
  intent: string
  toolNames: string[]
  orgName: string
  surface?: string
}): string {
  return [
    PROMPT_CACHE_VERSION,
    params.orgId,
    params.role,
    params.intent,
    params.toolNames.join(","),
    params.orgName,
    params.surface ?? "",
  ].join("|")
}
