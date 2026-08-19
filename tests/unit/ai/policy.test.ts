// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

describe("ai policy", () => {
  let classifySensitivity: typeof import("@/lib/ai/policy").classifySensitivity
  let getModelPolicy: typeof import("@/lib/ai/policy").getModelPolicy
  let isModelAllowedForSensitivity: typeof import("@/lib/ai/policy").isModelAllowedForSensitivity
  let isProviderDisabled: typeof import("@/lib/ai/policy").isProviderDisabled
  let isActionTypeDisabled: typeof import("@/lib/ai/policy").isActionTypeDisabled
  let isPulseEnabled: typeof import("@/lib/ai/policy").isPulseEnabled
  let isResourceChatEnabled: typeof import("@/lib/ai/policy").isResourceChatEnabled
  let isQuizGenerationEnabled: typeof import("@/lib/ai/policy").isQuizGenerationEnabled
  let isAiActionsEnabled: typeof import("@/lib/ai/policy").isAiActionsEnabled

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import("@/lib/ai/policy")
    classifySensitivity = mod.classifySensitivity
    getModelPolicy = mod.getModelPolicy
    isModelAllowedForSensitivity = mod.isModelAllowedForSensitivity
    isProviderDisabled = mod.isProviderDisabled
    isActionTypeDisabled = mod.isActionTypeDisabled
    isPulseEnabled = mod.isPulseEnabled
    isResourceChatEnabled = mod.isResourceChatEnabled
    isQuizGenerationEnabled = mod.isQuizGenerationEnabled
    isAiActionsEnabled = mod.isAiActionsEnabled
  })

  afterEach(() => {
    delete process.env.AI_DISABLE_PULSE
    delete process.env.AI_DISABLE_RESOURCE_CHAT
    delete process.env.AI_DISABLE_QUIZ_GENERATION
    delete process.env.AI_DISABLE_ACTIONS
    delete process.env.AI_DISABLE_PROVIDERS
    delete process.env.AI_DISABLE_ACTION_TYPES
  })

  describe("classifySensitivity", () => {
    test("analytics intent is always student-linked (grades/roster data)", () => {
      expect(
        classifySensitivity({ role: "teacher", surface: "dashboard", intent: "analytics" }),
      ).toBe("student_linked")
    })

    test("student-visible class runs are student-linked", () => {
      expect(
        classifySensitivity({ role: "student", surface: "class" }),
      ).toBe("student_linked")
    })

    test("teacher class and dashboard runs stay at org_context", () => {
      expect(classifySensitivity({ role: "teacher", surface: "class" })).toBe("org_context")
      expect(classifySensitivity({ role: "teacher", surface: "dashboard" })).toBe("org_context")
    })

    test("feature surfaces map correctly", () => {
      expect(classifySensitivity({ role: "teacher", surface: "resource" })).toBe("org_context")
      expect(classifySensitivity({ role: "student", surface: "quiz" })).toBe("org_context")
      // Pulse summarizes student-linked signals.
      expect(classifySensitivity({ role: "teacher", surface: "pulse" })).toBe("student_linked")
    })
  })

  describe("model allowlists", () => {
    test("org_context excludes free-tier and lowest-quality models", () => {
      const policy = getModelPolicy("org_context")
      expect(policy.allowedModels).toContain("cerebras:gpt-oss-120b")
      expect(policy.allowedModels.some((id) => id.includes(":free"))).toBe(false)
      expect(policy.allowedModels.some((id) => id.includes("llama-3.2-3b"))).toBe(false)
      expect(policy.allowFallback).toBe(true)
    })

    test("highly_sensitive allows premium models only and never falls back", () => {
      const policy = getModelPolicy("highly_sensitive")
      expect(policy.allowedModels).toEqual([
        "cerebras:gpt-oss-120b",
        "google:gemini-2.5-flash",
      ])
      expect(policy.allowFallback).toBe(false)
    })

    test("isModelAllowedForSensitivity gates model choice", () => {
      expect(
        isModelAllowedForSensitivity("openrouter:meta-llama/llama-3.3-70b-instruct:free", "org_context"),
      ).toBe(false)
      expect(
        isModelAllowedForSensitivity("cerebras:gpt-oss-120b", "student_linked"),
      ).toBe(true)
    })
  })

  describe("kill switches", () => {
    test("features are enabled by default", () => {
      expect(isPulseEnabled()).toBe(true)
      expect(isResourceChatEnabled()).toBe(true)
      expect(isQuizGenerationEnabled()).toBe(true)
      expect(isAiActionsEnabled()).toBe(true)
    })

    test("AI_DISABLE_* flags disable their feature", () => {
      process.env.AI_DISABLE_PULSE = "1"
      process.env.AI_DISABLE_RESOURCE_CHAT = "1"
      process.env.AI_DISABLE_QUIZ_GENERATION = "1"
      process.env.AI_DISABLE_ACTIONS = "1"
      expect(isPulseEnabled()).toBe(false)
      expect(isResourceChatEnabled()).toBe(false)
      expect(isQuizGenerationEnabled()).toBe(false)
      expect(isAiActionsEnabled()).toBe(false)
    })

    test("AI_DISABLE_PROVIDERS excludes providers from routing", () => {
      process.env.AI_DISABLE_PROVIDERS = "groq, openrouter"
      expect(isProviderDisabled("groq")).toBe(true)
      expect(isProviderDisabled("openrouter")).toBe(true)
      expect(isProviderDisabled("cerebras")).toBe(false)
    })

    test("AI_DISABLE_ACTION_TYPES disables individual action types", () => {
      process.env.AI_DISABLE_ACTION_TYPES = "create_quiz, create_announcement"
      expect(isActionTypeDisabled("create_quiz")).toBe(true)
      expect(isActionTypeDisabled("create_classwork")).toBe(false)
    })
  })
})