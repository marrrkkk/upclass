/**
 * Prompt-injection input sanitizer.
 *
 * Pipeline: lockout check -> normalization -> rejection patterns (fail
 * closed) -> sanitization patterns. Three strikes lock the conversation for
 * one hour. Only hashed input is ever stored.
 */
import { cacheIncrement, cacheGet } from "@/lib/ai/cache-layer"
import { logAiSecurityEvent } from "@/lib/ai/security/security-events"

const LOCKOUT_THRESHOLD = 3
const STRIKE_TTL_SECONDS = 3_600
const MAX_INPUT_LENGTH = 6_000

type Pattern = { label: string; pattern: RegExp }

const REJECTION_PATTERNS: Pattern[] = [
  // Instruction override (EN)
  { label: "instruction_override_en", pattern: /ignore\s+(all\s+|any\s+)?(previous|above|below|prior|earlier|system)\s+(instructions?|prompts?|rules|guidelines|context)/i },
  { label: "instruction_override_alt", pattern: /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules|context)/i },
  { label: "instruction_override_alt2", pattern: /do\s+not\s+follow\s+(the\s+)?(previous|above|prior|system)\s+(instructions?|prompts?|rules)/i },
  { label: "instruction_override_alt3", pattern: /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules)/i },
  { label: "instruction_override_alt4", pattern: /override\s+(all\s+)?(instructions?|prompts?|rules)/i },
  // Instruction override (ES)
  { label: "instruction_override_es", pattern: /ignora\s+(todas\s+)?(las\s+)?(instrucciones|reglas|indicaciones|prompts?)\s+(anteriores|previas|del\s+sistema)/i },
  { label: "instruction_override_es2", pattern: /olvida\s+(todas\s+)?(las\s+)?instrucciones/i },
  { label: "instruction_override_es3", pattern: /no\s+sigas\s+(las\s+)?instrucciones/i },
  // Role switching
  { label: "role_switch", pattern: /(you\s+are|act\s+as|pretend\s+(to\s+be|you\s+are)|imagine\s+you\s+are|from\s+now\s+on\s+you\s+are)\s+(now\s+)?(a|an|the)?\s*(system|developer|administrator|assistant|unrestricted|jailbroken)/i },
  // Prompt extraction / disclosure
  { label: "reveal_system_prompt", pattern: /(reveal|show|print|display|output|tell\s+me)\s+(me\s+)?(your|the|its)\s+(full\s+)?(system\s+)?(prompt|instructions?|system\s+message)/i },
  { label: "system_prompt_exfil", pattern: /(repeat|echo|copy|return)\s+(your|the)\s+(system|developer)\s+prompt/i },
  // Delimiters
  { label: "system_delimiter", pattern: /<\s*\|?\s*(system|developer|user|assistant)\s*\|?\s*>/i },
  // Encoding tricks
  { label: "base64_blob", pattern: /[A-Za-z0-9+/]{80,}={0,2}/ },
  { label: "url_encoded", pattern: /(?:%[0-9a-fA-F]{2}){3,}/ },
  { label: "html_entities", pattern: /&#\d{2,4};/ },
]

const SANITIZATION_PATTERNS: Pattern[] = [
  { label: "code_fence_system", pattern: /```\s*system\s*\n([\s\S]*?)```/gi },
  { label: "heading_system", pattern: /^#{1,6}\s*system\s*$/gim },
]

export type SanitizeResult =
  | { status: "clean"; output: string; patterns: string[] }
  | { status: "sanitized"; output: string; patterns: string[] }
  | { status: "rejected"; output: string; patterns: string[] }
  | { status: "locked"; output: string; patterns: string[] }

/** Strip zero-width characters and normalize unicode. */
function normalizeInput(input: string): string {
  return input
    .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, "")
    .normalize("NFKC")
    .trim()
}

function findFirstMatch(patterns: Pattern[], input: string): Pattern | null {
  for (const entry of patterns) {
    entry.pattern.lastIndex = 0
    if (entry.pattern.test(input)) return entry
  }
  return null
}

async function getStrikeCount(conversationId: string | undefined): Promise<number> {
  if (!conversationId) return 0
  const raw = await cacheGet(`inj:${conversationId}`)
  return raw ? Number(raw) : 0
}

async function registerStrike(conversationId: string | undefined): Promise<number> {
  if (!conversationId) return 0
  const count = await cacheIncrement(`inj:${conversationId}`, STRIKE_TTL_SECONDS)
  return count
}

/**
 * Sanitize user input before it reaches the model. Fail closed: any rejection
 * pattern match rejects the input; sanitization patterns are neutralized.
 */
export async function sanitizeAiInput(
  input: string,
  options: { conversationId?: string; userId?: string; orgId?: string } = {},
): Promise<SanitizeResult> {
  const raw = input ?? ""
  const normalized = normalizeInput(raw)
  const trimmed = normalized.slice(0, MAX_INPUT_LENGTH)

  const locked = (await getStrikeCount(options.conversationId)) >= LOCKOUT_THRESHOLD
  if (locked) {
    return { status: "locked", output: trimmed, patterns: ["conversation_locked"] }
  }

  const rejection = findFirstMatch(REJECTION_PATTERNS, trimmed)
  if (rejection) {
    const strikes = await registerStrike(options.conversationId)
    if (strikes >= LOCKOUT_THRESHOLD) {
      await logAiSecurityEvent({
        eventType: "conversation_locked",
        patternMatched: rejection.label,
        userId: options.userId,
        orgId: options.orgId,
        rawInput: trimmed,
      })
    } else {
      await logAiSecurityEvent({
        eventType: "injection_detected",
        patternMatched: rejection.label,
        userId: options.userId,
        orgId: options.orgId,
        rawInput: trimmed,
      })
    }

    if (strikes >= LOCKOUT_THRESHOLD) {
      return { status: "locked", output: trimmed, patterns: [rejection.label] }
    }
    return { status: "rejected", output: trimmed, patterns: [rejection.label] }
  }

  let sanitized = trimmed
  const matched: string[] = []
  for (const entry of SANITIZATION_PATTERNS) {
    entry.pattern.lastIndex = 0
    if (entry.pattern.test(sanitized)) {
      entry.pattern.lastIndex = 0
      sanitized = sanitized.replace(entry.pattern, "[sanitized]")
      matched.push(entry.label)
    }
  }

  if (matched.length > 0) {
    return { status: "sanitized", output: sanitized, patterns: matched }
  }

  return { status: "clean", output: sanitized, patterns: [] }
}

/**
 * Sanitize memory content before it is stored (RAG poisoning defense).
 * Rejects obvious injection attempts; trims and normalizes otherwise.
 */
export function sanitizeMemoryContent(title: string, content: string): {
  status: "clean" | "sanitized" | "rejected"
  title: string
  content: string
  patterns: string[]
} {
  const normalizedTitle = normalizeInput(title)
  const normalizedContent = normalizeInput(content)

  const rejection = findFirstMatch(REJECTION_PATTERNS, `${normalizedTitle}\n${normalizedContent}`)
  if (rejection) {
    return {
      status: "rejected",
      title: normalizedTitle,
      content: normalizedContent,
      patterns: [rejection.label],
    }
  }

  let sanitized = normalizedContent
  const matched: string[] = []
  for (const entry of SANITIZATION_PATTERNS) {
    entry.pattern.lastIndex = 0
    if (entry.pattern.test(sanitized)) {
      entry.pattern.lastIndex = 0
      sanitized = sanitized.replace(entry.pattern, "[sanitized]")
      matched.push(entry.label)
    }
  }

  return {
    status: matched.length > 0 ? "sanitized" : "clean",
    title: normalizedTitle,
    content: sanitized,
    patterns: matched,
  }
}