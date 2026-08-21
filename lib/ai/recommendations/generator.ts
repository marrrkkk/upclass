/**
 * Server-side recommendation generator.
 * Generates grounded follow-up suggestions based on actual tool results and conversation context.
 */
import type {
  AiRecommendation,
  RecommendationContext,
  RecommendationResult,
} from "./types"
import type { AiIntent } from "@/lib/ai/types"

/**
 * Generate deterministic recommendations based on tool results and structured cards.
 * Prefers deterministic generation from verified data over model-based generation.
 */
export function generateRecommendations(
  context: RecommendationContext,
): RecommendationResult {
  const recommendations: AiRecommendation[] = []
  const filterReasons: Record<string, number> = {}

  // Generate deterministic recommendations based on tool results
  const deterministicRecs = generateDeterministicRecommendations(context)
  recommendations.push(...deterministicRecs)

  // Generate recommendations from structured cards
  const cardBasedRecs = generateCardBasedRecommendations(context)
  recommendations.push(...cardBasedRecs)

  // Deduplicate by display text (case-insensitive)
  const seenTexts = new Set<string>()
  const deduplicated = recommendations.filter((rec) => {
    const normalized = rec.displayText.toLowerCase().trim()
    if (seenTexts.has(normalized)) {
      filterReasons.deduplication = (filterReasons.deduplication || 0) + 1
      return false
    }
    seenTexts.add(normalized)
    return true
  })

  // Limit to top 4 recommendations
  const limited = deduplicated.slice(0, 4)

  return {
    recommendations: limited,
    meta: {
      totalGenerated: recommendations.length,
      totalFiltered: recommendations.length - limited.length,
      filterReasons,
    },
  }
}

/**
 * Generate deterministic recommendations based on successful tool calls
 */
function generateDeterministicRecommendations(
  context: RecommendationContext,
): AiRecommendation[] {
  const recommendations: AiRecommendation[] = []

  // If a list tool was called successfully, recommend detail queries
  const listTools = context.toolCalls.filter(
    (tc) =>
      tc.success &&
      tc.hasData &&
      (tc.name.startsWith("list_") || tc.name.includes("search")),
  )

  for (const tool of listTools) {
    if (tool.name === "list_classes" && context.surface === "dashboard") {
      recommendations.push({
        id: `det-${tool.name}-details`,
        displayText: "Get details about a specific class",
        intent: "data_query",
        surface: "dashboard",
        requiredTools: ["get_class_details"],
        source: "tool_result",
        metadata: { sourceToolCall: tool.name },
      })
    } else if (tool.name === "list_classwork" && context.surface === "class") {
      recommendations.push({
        id: `det-${tool.name}-submissions`,
        displayText: "Check submission status for assignments",
        intent: "data_query",
        surface: "class",
        entityId: context.entityId,
        requiredTools: ["get_classwork_details"],
        source: "tool_result",
        metadata: { sourceToolCall: tool.name },
      })
    } else if (tool.name === "list_quizzes" && context.surface === "class") {
      recommendations.push({
        id: `det-${tool.name}-results`,
        displayText: "View quiz results and analytics",
        intent: "analytics",
        surface: "class",
        entityId: context.entityId,
        requiredTools: ["get_quiz_results"],
        source: "tool_result",
        metadata: { sourceToolCall: tool.name },
      })
    }
  }

  // If resource surface, recommend content-based questions
  if (context.surface === "resource") {
    recommendations.push(
      {
        id: "det-resource-summary",
        displayText: "Summarize the main points",
        intent: "general_question",
        surface: "resource",
        entityId: context.entityId,
        requiredTools: [],
        source: "deterministic",
      },
      {
        id: "det-resource-questions",
        displayText: "Generate practice questions",
        intent: "general_question",
        surface: "resource",
        entityId: context.entityId,
        requiredTools: [],
        source: "deterministic",
      },
    )
  }

  // If analytics or data query intent, offer related insights
  const hasAnalyticsTools = context.toolCalls.some(
    (tc) =>
      tc.success &&
      (tc.name === "get_student_overview" ||
        tc.name === "get_quiz_results" ||
        tc.name === "get_org_stats"),
  )

  if (hasAnalyticsTools && context.role === "teacher") {
    recommendations.push({
      id: "det-analytics-ungraded",
      displayText: "Show ungraded submissions",
      intent: "analytics",
      surface: context.surface,
      entityId: context.entityId !== "dashboard" ? context.entityId : undefined,
      requiredTools: ["get_ungraded_submissions"],
      source: "deterministic",
    })
  }

  return recommendations
}

/**
 * Generate recommendations from structured cards
 */
function generateCardBasedRecommendations(
  context: RecommendationContext,
): AiRecommendation[] {
  const recommendations: AiRecommendation[] = []

  for (const card of context.structuredCards) {
    const cardType = typeof card.type === "string" ? card.type : "unknown"

    // For class list cards, recommend exploring a class
    if (cardType === "class_list" && context.surface === "dashboard") {
      recommendations.push({
        id: `card-${cardType}-explore`,
        displayText: "Tell me more about one of these classes",
        intent: "data_query",
        surface: "dashboard",
        requiredTools: ["get_class_details", "get_class_roster"],
        cardType,
        source: "structured_card",
      })
    }

    // For classwork list cards, recommend action if teacher
    if (cardType === "classwork_list" && context.role === "teacher") {
      recommendations.push({
        id: `card-${cardType}-create`,
        displayText: "Create a new assignment",
        intent: "classwork_action",
        surface: "class",
        entityId: context.entityId,
        requiredTools: ["create_assignment"],
        cardType,
        source: "structured_card",
      })
    }

    // For quiz cards, recommend creating another quiz
    if (
      (cardType === "quiz_list" || cardType === "quiz_details") &&
      context.role === "teacher"
    ) {
      recommendations.push({
        id: `card-${cardType}-new`,
        displayText: "Draft a new quiz",
        intent: "quiz_action",
        surface: "class",
        entityId: context.entityId,
        requiredTools: ["draft_quiz"],
        cardType,
        source: "structured_card",
      })
    }
  }

  return recommendations
}
