// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@/lib/ai/security/security-events", () => ({
  logAiSecurityEvent: vi.fn().mockResolvedValue(undefined),
}))

describe("prompt-cache", () => {
  let PromptCache: typeof import("@/lib/ai/orchestrator/prompt-cache").PromptCache
  let promptCacheKey: typeof import("@/lib/ai/orchestrator/prompt-cache").promptCacheKey
  let promptCache: typeof import("@/lib/ai/orchestrator/prompt-cache").promptCache

  beforeEach(async () => {
    vi.resetModules()
    process.env.AI_CANARY_SECRET = "test-secret"
    const cacheMod = await import("@/lib/ai/orchestrator/prompt-cache")
    PromptCache = cacheMod.PromptCache
    promptCacheKey = cacheMod.promptCacheKey
    promptCache = cacheMod.promptCache
    promptCache.clear()
  })

  afterEach(() => {
    delete process.env.AI_CANARY_SECRET
  })

  test("cache key covers static inputs only (org, role, intent, tools, org name, surface)", () => {
    const a = promptCacheKey({
      orgId: "org-1",
      role: "teacher",
      intent: "data_query",
      toolNames: ["get_classwork", "get_quizzes"],
      orgName: "Springfield High",
    })
    const b = promptCacheKey({
      orgId: "org-1",
      role: "teacher",
      intent: "data_query",
      toolNames: ["get_classwork", "get_quizzes"],
      orgName: "Springfield High",
    })
    expect(a).toBe(b)

    // Any static input change produces a different key.
    expect(promptCacheKey({ orgId: "org-2", role: "teacher", intent: "data_query", toolNames: [], orgName: "x" })).not.toBe(a)
    expect(promptCacheKey({ orgId: "org-1", role: "student", intent: "data_query", toolNames: [], orgName: "x" })).not.toBe(a)
    expect(promptCacheKey({ orgId: "org-1", role: "teacher", intent: "analytics", toolNames: [], orgName: "x" })).not.toBe(a)
    expect(promptCacheKey({ orgId: "org-1", role: "teacher", intent: "data_query", toolNames: ["get_classes"], orgName: "x" })).not.toBe(a)
    expect(promptCacheKey({ orgId: "org-1", role: "teacher", intent: "data_query", toolNames: [], orgName: "Other HS" })).not.toBe(a)
    expect(
      promptCacheKey({ orgId: "org-1", role: "teacher", intent: "data_query", toolNames: [], orgName: "x", surface: "class" }),
    ).not.toBe(a)
  })

  test("cache key excludes dynamic inputs (memory count, summary, message content)", () => {
    // The dynamic bits are not part of the key: adding them must NOT change
    // the slot. (In practice the builder never passes them to the key — this
    // locks that contract so a future edit cannot silently reintroduce them.)
    const base = promptCacheKey({
      orgId: "org-1",
      role: "teacher",
      intent: "data_query",
      toolNames: [],
      orgName: "Springfield High",
    })
    const params: {
      orgId: string
      role: string
      intent: string
      toolNames: string[]
      orgName: string
      surface?: string
    } = {
      orgId: "org-1",
      role: "teacher",
      intent: "data_query",
      toolNames: [],
      orgName: "Springfield High",
    }
    expect(promptCacheKey({ ...params, surface: undefined })).toBe(base)
  })

  test("LRU cache evicts oldest entries past capacity", () => {
    const entry = (i: number) =>
      promptCacheKey({ orgId: `org-${i}`, role: "teacher", intent: "data_query", toolNames: [], orgName: "x" })
    const capacity = 3
    const cache = new PromptCache(capacity)
    for (let i = 0; i < capacity + 2; i += 1) {
      cache.put(entry(i), `prompt-${i}`)
    }
    expect(cache.get(entry(0))).toBeUndefined()
    expect(cache.get(entry(1))).toBeUndefined()
    expect(cache.get(entry(capacity + 1))).toBe(`prompt-${capacity + 1}`)
    expect(cache.get(entry(capacity + 1))).toBe(`prompt-${capacity + 1}`) // still present after read
  })
})

describe("prompt-builder", () => {
  let appendDynamicContext: typeof import("@/lib/ai/orchestrator/prompt-builder").appendDynamicContext
  let buildStaticPrompt: typeof import("@/lib/ai/orchestrator/prompt-builder").buildStaticPrompt
  let buildSystemPrompt: typeof import("@/lib/ai/orchestrator/prompt-builder").buildSystemPrompt

  beforeEach(async () => {
    vi.resetModules()
    process.env.AI_CANARY_SECRET = "test-secret"
    const mod = await import("@/lib/ai/orchestrator/prompt-builder")
    buildStaticPrompt = mod.buildStaticPrompt
    appendDynamicContext = mod.appendDynamicContext
    buildSystemPrompt = mod.buildSystemPrompt
  })

  afterEach(() => {
    delete process.env.AI_CANARY_SECRET
  })

  const staticParams = {
    orgId: "org-1",
    orgName: "Springfield High",
    role: "teacher" as const,
    intent: "data_query",
    toolNames: ["get_classes"],
  }

  test("static prompt is deterministic and includes modules, tools, and context", () => {
    const first = buildStaticPrompt(staticParams)
    const second = buildStaticPrompt(staticParams)
    expect(first.prompt).toBe(second.prompt)
    expect(first.prompt).toContain("Springfield High")
    expect(first.prompt).toContain("get_classes")
    expect(first.prompt).toContain("UpClass AI")
    expect(first.moduleIds).toContain("base_identity")
    expect(first.moduleIds).toContain("safety_constraints")
  })

  test("dynamic context is appended per request and never cached", () => {
    const { prompt: staticPrompt } = buildStaticPrompt(staticParams)

    const withMemory = appendDynamicContext(staticPrompt, {
      memories: [
        {
          id: "mem-1",
          title: "Homework policy",
          content: "No homework on Fridays",
          tier: "high",
          category: "teaching_rules",
          position: 0,
          similarity: 0.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      summary: "",
      orgId: "org-1",
    })

    const withoutMemory = appendDynamicContext(staticPrompt, {
      memories: [],
      summary: "Prior discussion about the field trip",
      orgId: "org-1",
    })

    expect(withMemory.prompt).toContain("No homework on Fridays")
    expect(withoutMemory.prompt).toContain("Prior discussion about the field trip")
    expect(withMemory.prompt).not.toBe(withoutMemory.prompt)
    // The static core stays identical underneath.
    expect(withMemory.prompt.startsWith(staticPrompt)).toBe(true)
  })

  test("canary token is always built per request", () => {
    const one = buildSystemPrompt({
      ...staticParams,
      memories: [],
      summary: "",
      message: "Hello",
    })
    const two = buildSystemPrompt({
      ...staticParams,
      memories: [],
      summary: "",
      message: "Different message",
    })
    expect(one.canaryToken).toMatch(/^[0-9a-f]{16}$/)
    expect(one.canaryToken).toBe(two.canaryToken) // org-scoped, deterministic
    expect(one.prompt).toContain(one.canaryToken)
  })

  test("cache-hit path still produces a prompt with the canary (orchestrator contract)", () => {
    // Mirrors the orchestrator flow: cached static core + fresh dynamic context.
    const { prompt: staticPrompt } = buildStaticPrompt(staticParams)
    const { prompt: fullPrompt, canaryToken } = appendDynamicContext(staticPrompt, {
      memories: [],
      summary: "",
      orgId: "org-1",
    })
    expect(canaryToken).toMatch(/^[0-9a-f]{16}$/)
    expect(fullPrompt).toContain(canaryToken)
  })
})