/**
 * Tests for AI recommendation system
 */
import { describe, it, expect } from "vitest"
import { recommendationSchema } from "@/lib/ai/recommendations/types"
import { validateRecommendation, deduplicateRecommendations } from "@/lib/ai/recommendations/validator"
import type { AiRecommendation, RecommendationContext } from "@/lib/ai/recommendations"

describe("Recommendation Schema Validation", () => {
  it("should validate valid recommendation", () => {
    const recommendation: AiRecommendation = {
      id: "rec-1",
      displayText: "What assignments are due this week?",
      intent: "data_query",
      surface: "dashboard",
      requiredTools: ["list_classwork"],
      source: "deterministic",
    }

    const result = recommendationSchema.safeParse(recommendation)
    expect(result.success).toBe(true)
  })

  it("should reject invalid intent", () => {
    const invalid = {
      id: "rec-1",
      displayText: "Test",
      intent: "invalid_intent",
      surface: "dashboard",
      requiredTools: [],
      source: "deterministic",
    }

    const result = recommendationSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject empty display text", () => {
    const invalid = {
      id: "rec-1",
      displayText: "",
      intent: "data_query",
      surface: "dashboard",
      requiredTools: [],
      source: "deterministic",
    }

    const result = recommendationSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe("Recommendation Validation", () => {
  const mockContext: RecommendationContext = {
    surface: "dashboard",
    entityId: "dashboard",
    userId: "user-1",
    orgId: "org-1",
    role: "student",
    recentMessages: [],
    toolCalls: [],
    structuredCards: [],
    availableTools: ["list_classes", "get_org_stats"],
  }

  it("should validate recommendation with available tools", () => {
    const recommendation: AiRecommendation = {
      id: "rec-1",
      displayText: "Show my classes",
      intent: "data_query",
      surface: "dashboard",
      requiredTools: ["list_classes"],
      source: "deterministic",
    }

    const result = validateRecommendation(recommendation, mockContext)
    expect(result.valid).toBe(true)
  })

  it("should reject recommendation with unavailable tools", () => {
    const recommendation: AiRecommendation = {
      id: "rec-1",
      displayText: "Draft a quiz",
      intent: "quiz_action",
      surface: "dashboard",
      requiredTools: ["draft_quiz"],
      source: "deterministic",
    }

    const result = validateRecommendation(recommendation, mockContext)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe("tool_unavailable")
  })

  it("should reject surface mismatch", () => {
    const recommendation: AiRecommendation = {
      id: "rec-1",
      displayText: "Class question",
      intent: "data_query",
      surface: "class",
      entityId: "class-123",
      requiredTools: [],
      source: "deterministic",
    }

    const result = validateRecommendation(recommendation, mockContext)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe("surface_mismatch")
  })
})

describe("Recommendation Deduplication", () => {
  it("should remove duplicate display text", () => {
    const recommendations: AiRecommendation[] = [
      {
        id: "rec-1",
        displayText: "Show my classes",
        intent: "data_query",
        surface: "dashboard",
        requiredTools: [],
        source: "deterministic",
      },
      {
        id: "rec-2",
        displayText: "Show My Classes",
        intent: "data_query",
        surface: "dashboard",
        requiredTools: [],
        source: "deterministic",
      },
      {
        id: "rec-3",
        displayText: "List resources",
        intent: "data_query",
        surface: "dashboard",
        requiredTools: [],
        source: "deterministic",
      },
    ]

    const unique = deduplicateRecommendations(recommendations)
    expect(unique).toHaveLength(2)
    expect(unique[0]?.displayText).toBe("Show my classes")
    expect(unique[1]?.displayText).toBe("List resources")
  })
})
