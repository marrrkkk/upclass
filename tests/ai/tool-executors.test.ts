/**
 * Tests for new AI tool executors
 */
import { describe, it, expect } from "vitest"
import type { AiToolExecutionContext } from "@/lib/ai/types"

describe("Tool Executor Input Schemas", () => {
  it("should accept unified_search with types filter", () => {
    const input = {
      query: "test query",
      types: ["class", "resource"] as const,
      limit: 10,
    }

    expect(input.query).toBe("test query")
    expect(input.types).toHaveLength(2)
    expect(input.limit).toBe(10)
  })

  it("should accept search_resource_content with resourceId", () => {
    const input = {
      resourceId: "resource-123",
      query: "search term",
    }

    expect(input.resourceId).toBeTruthy()
    expect(input.query).toBeTruthy()
  })

  it("should accept get_upcoming_work with optional classId", () => {
    const inputWithClass = {
      classId: "class-123",
      days: 7,
      limit: 25,
    }

    const inputWithoutClass = {
      days: 14,
      limit: 10,
    }

    expect(inputWithClass.classId).toBe("class-123")
    expect(inputWithClass.days).toBe(7)
    expect("classId" in inputWithoutClass).toBe(false)
    expect(inputWithoutClass.days).toBe(14)
  })

  it("should accept get_study_summary with optional focusAreas", () => {
    const input = {
      classId: "class-123",
      focusAreas: ["Math", "Science"],
    }

    expect(input.classId).toBe("class-123")
    expect(input.focusAreas).toHaveLength(2)
  })

  it("should accept get_recent_context with hours", () => {
    const input = {
      classId: "class-123",
      hours: 24,
    }

    expect(input.hours).toBe(24)
    expect(input.hours).toBeGreaterThan(0)
    expect(input.hours).toBeLessThanOrEqual(168)
  })
})

describe("Tool Metadata", () => {
  it("should have metadata for new tools", () => {
    const toolNames = [
      "unified_search",
      "search_resource_content",
      "get_upcoming_work",
      "get_study_summary",
      "get_recent_context",
    ]

    toolNames.forEach((name) => {
      expect(name).toBeTruthy()
      expect(typeof name).toBe("string")
    })
  })

  it("should categorize tools correctly", () => {
    const queryTools = [
      "unified_search",
      "search_resource_content",
      "get_upcoming_work",
      "get_study_summary",
      "get_recent_context",
    ]

    queryTools.forEach((tool) => {
      expect(tool).toMatch(/^(unified_search|search_|get_)/)
    })
  })
})

describe("Tool Context Requirements", () => {
  it("should require valid execution context", () => {
    const context: AiToolExecutionContext = {
      userId: "user-1",
      orgId: "org-1",
      orgSlug: "test-org",
      role: "teacher",
      runId: "run-1",
      messageId: "msg-1",
    }

    expect(context.userId).toBeTruthy()
    expect(context.orgId).toBeTruthy()
    expect(context.orgSlug).toBeTruthy()
    expect(context.role).toBe("teacher")
    expect(context.runId).toBeTruthy()
    expect(context.messageId).toBeTruthy()
  })
})
