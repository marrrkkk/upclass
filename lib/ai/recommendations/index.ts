/**
 * Recommendation system entry point.
 * Generates, validates, and returns grounded recommendations for follow-up questions.
 */
export * from "./types"
export * from "./generator"
export * from "./validator"

import type { AiRecommendation, RecommendationContext, RecommendationResult } from "./types"
import { generateRecommendations } from "./generator"
import { filterRecommendations, rankRecommendations, deduplicateRecommendations } from "./validator"

/**
 * Main entry point: generate and validate recommendations
 */
export function createRecommendations(context: RecommendationContext): RecommendationResult {
  // Generate initial recommendations
  const generated = generateRecommendations(context)
  
  // Validate and filter
  const { valid, rejected } = filterRecommendations(generated.recommendations, context)
  
  // Deduplicate
  const deduplicated = deduplicateRecommendations(valid)
  
  // Rank by relevance
  const ranked = rankRecommendations(deduplicated, context)
  
  // Limit to top 4
  const final = ranked.slice(0, 4)
  
  // Aggregate filter reasons
  const filterReasons = {
    ...generated.meta.filterReasons,
  }
  
  for (const { reason } of rejected) {
    filterReasons[reason] = (filterReasons[reason] || 0) + 1
  }
  
  return {
    recommendations: final,
    meta: {
      totalGenerated: generated.meta.totalGenerated,
      totalFiltered: generated.meta.totalGenerated - final.length,
      filterReasons,
    },
  }
}
