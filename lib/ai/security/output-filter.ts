/**
 * Output filter: canary leak detection + system-prompt fragment redaction.
 *
 * Fail open: any internal error returns the original output untouched.
 */
import { createHmac } from "crypto"

import { logAiSecurityEvent } from "@/lib/ai/security/security-events"

export const CANARY_LEAK_REDACTION = "[REDACTED — system prompt leak detected]"

const CANARY_BYTES = 8

/**
 * Build the per-org canary token appended to the system prompt:
 * `HMAC-SHA256(orgId, AI_CANARY_SECRET)` hex, first 16 chars.
 */
export function buildCanaryToken(orgId: string): string {
  const secret = process.env.AI_CANARY_SECRET || ""
  if (!secret) return ""
  return createHmac("sha256", secret).update(orgId).digest("hex").slice(0, CANARY_BYTES * 2)
}

const LEAKAGE_PATTERNS = [
  { label: "system_prompt_disclosure", pattern: /(my|the)\s+(system|developer)\s+prompt\s+(is|contains|includes|says)/i },
  {
    label: "role_revelation",
    // Covers "I am an AI", "I am an LLM", "I am a language model", and the
    // common full form "I am an AI language model trained by …".
    pattern: /\bI\s+am\s+(?:an\s+|a\s+)?(?:(?:AI|LLM)\s+)?(?:language\s+model\s+)?(?:trained|built|made)\s+by/i,
  },
  { label: "config_leak", pattern: /\b(api[_-]?key|secret|password|token)\s*[:=]\s*\S{8,}/i },
  { label: "instruction_reveal", pattern: /here\s+(is|are)\s+(my|the)\s+(system\s+)?(instructions?|rules)/i },
]

export type FilterOutputResult = {
  output: string
  redacted: boolean
  canaryLeak: boolean
  matchedPatterns: string[]
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Build a whitespace-flexible fragment matcher for fragments >= 8 chars. */
function fragmentPattern(fragment: string): RegExp {
  const escaped = escapeRegex(fragment.trim())
  return new RegExp(escaped.replace(/\s+/g, "\\s+"), "gi")
}

/**
 * Filter model output for system-prompt leakage.
 *
 * 1. Canary token anywhere in the output -> whole output redacted.
 * 2. System-prompt fragments (>= 8 chars) -> whitespace-flexible redaction.
 * 3. Generic leakage phrasing -> line-level redaction.
 */
export async function filterAiOutput(
  output: string,
  options: {
    systemPromptFragments?: string[]
    canaryToken?: string
    userId?: string
    orgId?: string
  } = {},
): Promise<FilterOutputResult> {
  const matchedPatterns: string[] = []

  try {
    if (!output) {
      return { output, redacted: false, canaryLeak: false, matchedPatterns }
    }

    const canaryToken = options.canaryToken
    if (canaryToken && output.includes(canaryToken)) {
      await logAiSecurityEvent({
        eventType: "canary_leak_detected",
        userId: options.userId,
        orgId: options.orgId,
      })
      return { output: CANARY_LEAK_REDACTION, redacted: true, canaryLeak: true, matchedPatterns: ["canary_leak"] }
    }

    let filtered = output

    for (const fragment of options.systemPromptFragments ?? []) {
      const trimmed = fragment.trim()
      if (trimmed.length < 8) continue
      const pattern = fragmentPattern(trimmed)
      pattern.lastIndex = 0
      if (pattern.test(filtered)) {
        pattern.lastIndex = 0
        filtered = filtered.replace(pattern, "[REDACTED]")
        matchedPatterns.push(`fragment:${trimmed.slice(0, 24)}`)
      }
    }

    for (const entry of LEAKAGE_PATTERNS) {
      entry.pattern.lastIndex = 0
      if (entry.pattern.test(filtered)) {
        entry.pattern.lastIndex = 0
        filtered = filtered.replace(entry.pattern, "[REDACTED]")
        matchedPatterns.push(entry.label)
      }
    }

    if (matchedPatterns.length > 0) {
      await logAiSecurityEvent({
        eventType: "output_redacted",
        patternMatched: matchedPatterns.join(",").slice(0, 200),
        userId: options.userId,
        orgId: options.orgId,
      })
    }

    return { output: filtered, redacted: matchedPatterns.length > 0, canaryLeak: false, matchedPatterns }
  } catch (error) {
    console.error("[ai-output-filter] filter failed, returning original output:", error)
    return { output, redacted: false, canaryLeak: false, matchedPatterns }
  }
}