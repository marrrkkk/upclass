// @vitest-environment node

/**
 * Resource AI chat authorization (5.3): non-owners get 404 (never 403, to
 * avoid leaking resource existence), owners proceed, and the disabled kill
 * switch blocks the route before any model call.
 */
import { beforeEach, describe, expect, test, vi } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const enforceAIRateLimitMock = vi.fn()
const resolveResourceAccessMock = vi.fn()
const streamWithFallbackMock = vi.fn()
const isResourceChatEnabledMock = vi.fn()
const logAiInvocationMock = vi.fn()

const selectLimitMock = vi.fn()
const selectOrderByMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectWhereMock = vi.fn(() => ({ orderBy: selectOrderByMock, limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

const txInsertChain = {
  values: vi.fn(() => txInsertChain),
  onConflictDoUpdate: vi.fn(() => txInsertChain),
  onConflictDoNothing: vi.fn(() => txInsertChain),
  returning: vi.fn(),
}
const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
  callback({ insert: vi.fn(() => txInsertChain) }),
)

vi.mock("next/headers", () => ({ headers: headersMock }))
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: getSessionMock } } }))
vi.mock("@/lib/ai-rate-limit", () => ({ enforceAIRateLimit: enforceAIRateLimitMock }))
vi.mock("@/db", () => ({ db: { select: selectMock, transaction: transactionMock } }))
vi.mock("@/lib/resource-text-extraction", () => ({
  ExtractionError: class ExtractionError extends Error {},
  extractResourceText: vi.fn(),
}))
vi.mock("@/lib/ai/access", () => ({ resolveResourceAccess: resolveResourceAccessMock }))
vi.mock("@/lib/ai/router", () => ({ streamWithFallback: streamWithFallbackMock }))
vi.mock("@/lib/ai/policy", () => ({ isResourceChatEnabled: isResourceChatEnabledMock }))
vi.mock("@/lib/ai/token-logger", () => ({ logAiInvocation: logAiInvocationMock }))
vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(async (messages: unknown) => messages),
  createUIMessageStreamResponse: vi.fn(() => new Response("ok", { status: 200 })),
  toUIMessageStream: vi.fn(({ stream }: { stream: unknown }) => stream),
}))

const resource = {
  id: "res-1",
  title: "Chapter 4 notes",
  description: null,
  category: "General",
  fileUrl: "https://storage.example/resources/res-1.pdf",
  fileName: "ch4.pdf",
  fileType: "pdf",
  aiSourceText: "extracted source text",
  ownerId: "owner-1",
}

const requestBody = {
  resourceId: "res-1",
  message: "Summarize this",
  clientMessageId: "client-1",
}

const emptyStream = {
  [Symbol.asyncIterator]: async function* () {
    /* not consumed */
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  headersMock.mockResolvedValue(new Headers())
  getSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  enforceAIRateLimitMock.mockResolvedValue({ allowed: true, dailyLimit: 20 })
  isResourceChatEnabledMock.mockReturnValue(true)
  selectLimitMock.mockResolvedValue([resource])
  txInsertChain.returning
    .mockResolvedValueOnce([{ id: "conv-1" }]) // conversation upsert
    .mockResolvedValueOnce([{ id: "user-msg-1" }]) // user message insert
  streamWithFallbackMock.mockResolvedValue({
    result: { stream: emptyStream },
    modelId: "test-model",
    provider: "test",
    attemptedModels: ["test-model"],
    fallbacks: [],
  })
})

describe("resource AI chat route", () => {
  test("blocks the route when the kill switch is off", async () => {
    isResourceChatEnabledMock.mockReturnValue(false)
    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }) as never,
    )
    expect(response.status).toBe(403)
    expect(streamWithFallbackMock).not.toHaveBeenCalled()
  })

  test("returns 404 for a non-owner with no shared org (no existence leak)", async () => {
    resolveResourceAccessMock.mockResolvedValue(false)
    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }) as never,
    )
    expect(response.status).toBe(404)
    expect(streamWithFallbackMock).not.toHaveBeenCalled()
  })

  test("returns 404 when the resource does not exist", async () => {
    selectLimitMock.mockResolvedValue([])
    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }) as never,
    )
    expect(response.status).toBe(404)
    expect(resolveResourceAccessMock).not.toHaveBeenCalled()
  })

  test("owner streams a response with exactly one user message", async () => {
    resolveResourceAccessMock.mockResolvedValue(true)
    // After the transaction: history load (getRecentMessages) + org lookup.
    selectLimitMock
      .mockResolvedValueOnce([resource])
      .mockResolvedValueOnce([]) // history: empty
      .mockResolvedValueOnce([{ orgId: "org-1" }]) // user org for usage log

    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }) as never,
    )

    expect(response.status).toBe(200)
    const [options] = streamWithFallbackMock.mock.calls[0]
    const userMessages = options.messages.filter(
      (message: { role: string }) => message.role === "user",
    )
    expect(userMessages).toHaveLength(1)
    expect(userMessages[0].parts[0].text).toBe("Summarize this")
    expect(options.sensitivity).toBe("org_context")
  })
})