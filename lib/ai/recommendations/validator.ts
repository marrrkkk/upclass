/**
 * Recommendation validation and filtering.
 * Ensures recommendations are safe, authorized, and grounded in available data.
 */
import type { AiRecommendation, RecommendationContext } from "./types"
import { recommendationSchema } from "./types"
import { ALL_TOOL_METADATA } from "@/lib/ai/tools/tool-metadata"

export type ValidationResult = {
  valid: boolean
  reason?: string
}

/**
 * Validate a single recommendation against context and capabilities
 */
export function validateRecommendation(
  recommendation: AiRecommendation,
  context: RecommendationContext,
): ValidationResult {
  // Schema validation
  const parsed = recommendationSchema.safeParse(recommendation)
  if (!parsed.success) {
    return { valid: false, reason: "schema_invalid" }
  }

  // Surface matching
  if (recommendation.surface !== context.surface) {
    return { valid: false, reason: "surface_mismatch" }
  }

  // Entity matching (for class/resource surfaces)
  if (
    recommendation.entityId &&
    context.entityId !== "dashboard" &&
    recommendation.entityId !== context.entityId
  ) {
    return { valid: false, reason: "entity_mismatch" }
  }

  // Tool availability check
  for (const toolName of recommendation.requiredTools) {
    if (!context.availableTools.includes(toolName)) {
      return { valid: false, reason: "tool_unavailable" }
    }

    // Check tool metadata for role/surface restrictions
    const metadata = ALL_TOOL_METADATA.find((t) => t.name === toolName)
    if (metadata) {
      // Check if tool is appropriate for this intent
      if (
        !metadata.intents.includes(recommendation.intent) &&
        recommendation.intent !== "general_question"
      ) {
        return { valid: false, reason: "intent_mismatch" }
      }
    }
  }

  // Authorization check for action recommendations
  if (
    (recommendation.intent === "classwork_action" ||
      recommendation.intent === "quiz_action") &&
    context.role !== "teacher"
  ) {
    return { valid: false, reason: "unauthorized_action" }
  }

  // Duplicate detection (check against recent user messages)
  const recentUserMessages = context.recentMessages
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase().trim())

  const recText = recommendation.displayText.toLowerCase().trim()
  if (recentUserMessages.some((msg) => msg.includes(recText) || recText.includes(msg))) {
    return { valid: false, reason: "duplicate_recent" }
  }

  return { valid: true }
}

/**
 * Filter and validate a list of recommendations
 */
export function filterRecommendations(
  recommendations: AiRecommendation[],
  context: RecommendationContext,
): {
  valid: AiRecommendation[]
  rejected: Array<{ recommendation: AiRecommendation; reason: string }>
} {
  const valid: AiRecommendation[] = []
  const rejected: Array<{ recommendation: AiRecommendation; reason: string }> = []

  for (const rec of recommendations) {
    const result = validateRecommendation(rec, context)
    if (result.valid) {
      valid.push(rec)
    } else {
      rejected.push({ recommendation: rec, reason: result.reason || "unknown" })
    }
  }

  return { valid, rejected }
}

/**
 * Deduplicate recommendations by content similarity
 */
export function deduplicateRecommendations(
  recommendations: AiRecommendation[],
): AiRecommendation[] {
  const seen = new Set<string>()
  const unique: AiRecommendation[] = []

  for (const rec of recommendations) {
    const normalized = rec.displayText.toLowerCase().trim()
    if (!seen.has(normalized)) {
      seen.add(normalized)
      unique.push(rec)
    }
  }

  return unique
}

/**
 * Rank recommendations by relevance and confidence
 */
export function rankRecommendations(
  recommendations: AiRecommendation[],
  context: RecommendationContext,
): AiRecommendation[] {
  return [...recommendations].sort((a, b) => {
    // Prioritize tool-result-based over model-generated
    const sourceScore: Record<string, number> = {
      tool_result: 4,
      structured_card: 3,
      deterministic: 2,
      model_generated: 1,
    }
    const aScore = sourceScore[a.source] || 0
    const bScore = sourceScore[b.source] || 0
    if (aScore !== bScore) return bScore - aScore

    // Prioritize recommendations matching current intent
    const lastAssistantMessage = context.recentMessages
      .filter((m) => m.role === "assistant")
      .pop()
    if (lastAssistantMessage) {
      // Simple heuristic: if the message mentions classwork, prioritize classwork actions
      const content = lastAssistantMessage.content.toLowerCase()
      if (content.includes("assignment") || content.includes("classwork")) {
        if (a.intent === "classwork_action" && b.intent !== "classwork_action") return -1
        if (b.intent === "classwork_action" && a.intent !== "classwork_action") return 1
      }
      if (content.includes("quiz")) {
        if (a.intent === "quiz_action" && b.intent !== "quiz_action") return -1
        if (b.intent === "quiz_action" && a.intent !== "quiz_action") return 1
      }
    }

    // Use confidence score if available
    const aConf = a.metadata?.confidence || 0.5
    const bConf = b.metadata?.confidence || 0.5
    return bConf - aConf
  })
}
