// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  resolveLanguageModel: vi.fn(),
  selectSimpleTextModels: vi.fn(),
  selectComplexTextModels: vi.fn(),
  selectToolCallingModels: vi.fn(),
}))

vi.mock("@/lib/ai/registry", () => ({ resolveLanguageModel: mocks.resolveLanguageModel }))
vi.mock("@/lib/ai/capacity-selector", () => ({
  markModelExhausted: vi.fn(),
  recordModelUsage: vi.fn(),
  selectSimpleTextModels: mocks.selectSimpleTextModels,
  selectComplexTextModels: mocks.selectComplexTextModels,
  selectToolCallingModels: mocks.selectToolCallingModels,
}))

describe("model routing policy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveLanguageModel.mockReturnValue({})
    const selection = {
      available: [
        { modelId: "cerebras:gpt-oss-120b", provider: "cerebras", quality: 8, toolCapable: true, rpm: 30, rpd: 1000 },
        { modelId: "google:gemini-2.5-flash", provider: "google", quality: 8, toolCapable: true, rpm: 15, rpd: 250 },
      ],
      stressed: [],
    }
    mocks.selectSimpleTextModels.mockResolvedValue(selection)
    mocks.selectComplexTextModels.mockResolvedValue(selection)
    mocks.selectToolCallingModels.mockResolvedValue(selection)
  })

  test("rejects a pinned model outside the sensitivity allowlist", async () => {
    const { buildModelCandidates } = await import("@/lib/ai/router")
    await expect(buildModelCandidates({
      modelId: "openrouter:meta-llama/llama-3.3-70b-instruct:free",
      sensitivity: "org_context",
    })).resolves.toEqual([])
  })

  test("returns one candidate when highly sensitive fallback is disabled", async () => {
    const { buildModelCandidates } = await import("@/lib/ai/router")
    const candidates = await buildModelCandidates({ sensitivity: "highly_sensitive" })
    expect(candidates).toEqual([{ modelId: "cerebras:gpt-oss-120b", provider: "cerebras" }])
  })
})

