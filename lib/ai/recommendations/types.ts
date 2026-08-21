/**
 * Types and schema for grounded AI recommendations.
 * Recommendations are generated server-side based on actual tool results and conversation context.
 */
import { z } from "zod"
import type { AiSurface, AiIntent } from "@/lib/ai/types"

/**
 * A recommendation is a suggested follow-up question or action that:
 * - Is grounded in actual tool results or structured cards from the latest turn
 * - Only suggests tools that are available to the current user/surface
 * - References data that was actually returned (no hallucinated suggestions)
 * - Matches the current surface and entity context
 */
export type AiRecommendation = {
  /** Stable identifier for deduplication */
  id: string
  /** Display text shown to the user */
  displayText: string
  /** Target intent classification */
  intent: AiIntent
  /** Required surface (must match current conversation) */
  surface: AiSurface
  /** Optional entity ID (for class/resource-specific recommendations) */
  entityId?: string
  /** Tool names that must be available for this recommendation */
  requiredTools: string[]
  /** Optional card type that this recommendation references */
  cardType?: string
  /** Optional action type for mutation recommendations */
  actionType?: string
  /** Source of this recommendation (for debugging/audit) */
  source: "tool_result" | "structured_card" | "deterministic" | "model_generated"
  /** Metadata for grounding validation */
  metadata?: {
    /** IDs of entities referenced (class IDs, resource IDs, etc.) */
    referencedEntityIds?: string[]
    /** Tool call that generated the data for this recommendation */
    sourceToolCall?: string
    /** Confidence score if model-generated (0-1) */
    confidence?: number
  }
}

export const recommendationSchema = z.object({
  id: z.string().min(1),
  displayText: z.string().min(1).max(200),
  intent: z.enum([
    "data_query",
    "classwork_action",
    "quiz_action",
    "analytics",
    "general_question",
    "memory_recall",
    "workflow_guidance",
  ]),
  surface: z.enum(["dashboard", "class", "resource"]),
  entityId: z.string().optional(),
  requiredTools: z.array(z.string()).min(0).max(10),
  cardType: z.string().optional(),
  actionType: z.string().optional(),
  source: z.enum(["tool_result", "structured_card", "deterministic", "model_generated"]),
  metadata: z
    .object({
      referencedEntityIds: z.array(z.string()).optional(),
      sourceToolCall: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

/**
 * Context needed for generating recommendations
 */
export type RecommendationContext = {
  surface: AiSurface
  entityId: string
  userId: string
  orgId: string
  role: "teacher" | "student"
  /** Recent conversation messages (last 2-4) */
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>
  /** Tool calls made during the latest assistant turn */
  toolCalls: Array<{ name: string; success: boolean; hasData: boolean }>
  /** Structured cards returned during the latest turn */
  structuredCards: Array<{ type: string; data: unknown }>
  /** Available tools for the current user/surface */
  availableTools: string[]
}

/**
 * Result of recommendation generation
 */
export type RecommendationResult = {
  recommendations: AiRecommendation[]
  /** Metadata about the generation process */
  meta: {
    totalGenerated: number
    totalFiltered: number
    filterReasons: Record<string, number>
  }
}
