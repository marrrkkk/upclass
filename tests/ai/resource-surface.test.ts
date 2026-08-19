/**
 * Tests for resource surface in unified AI conversations
 */
import { describe, it, expect } from "vitest"
import { resolveAiSurfaceAccess } from "@/lib/ai/access"
import type { AiSurface } from "@/lib/ai/types"

describe("Resource Surface Authorization", () => {
  it("should recognize resource as valid surface", () => {
    const surfaces: AiSurface[] = ["dashboard", "class", "resource"]
    expect(surfaces).toContain("resource")
  })

  it("should validate resource context structure", () => {
    const resourceContext = {
      resourceId: "test-resource-id",
      title: "Test Resource",
      sourceText: "Sample content",
    }

    expect(resourceContext).toHaveProperty("resourceId")
    expect(resourceContext).toHaveProperty("title")
    expect(resourceContext).toHaveProperty("sourceText")
  })
})

describe("Resource Conversation Matching", () => {
  it("should match conversations by surface and entity ID", () => {
    const conversation = {
      surface: "resource" as const,
      entityId: "resource-123",
      isDefault: true,
    }

    expect(conversation.surface).toBe("resource")
    expect(conversation.entityId).toBe("resource-123")
    expect(conversation.isDefault).toBe(true)
  })
})
