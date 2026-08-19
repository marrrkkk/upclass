// @vitest-environment node

import { beforeEach, describe, expect, test, vi, afterEach } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const limitMock = vi.fn()
const orderByLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: limitMock, orderBy: vi.fn(() => ({ limit: orderByLimitMock })) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const insertChain = {
  values: vi.fn(() => insertChain),
  onConflictDoUpdate: vi.fn(() => insertChain),
  onConflictDoNothing: vi.fn(() => insertChain),
  returning: vi.fn(),
}
const dbInsertMock = vi.fn(() => insertChain)
const txInsertMock = vi.fn((..._args: unknown[]) => insertChain)
const executeMock = vi.fn().mockResolvedValue(undefined)
const transactionMock = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
  callback({ insert: txInsertMock, execute: executeMock }),
)
const updateWhereMock = vi.fn().mockResolvedValue(undefined)
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const extractResourceTextMock = vi.fn()

// Mock AI SDK's streamText
const streamTextMock = vi.fn()
const streamWithFallbackMock = vi.fn()
const logAiInvocationMock = vi.fn().mockResolvedValue(undefined)

vi.mock("next/headers", () => ({
  headers: headersMock,
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}))

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: dbInsertMock,
    update: updateMock,
    transaction: transactionMock,
  },
}))

vi.mock("@/lib/resource-text-extraction", () => ({
  ExtractionError: class ExtractionError extends Error {},
  extractResourceText: extractResourceTextMock,
}))

vi.mock("@/lib/ai/router", () => ({ streamWithFallback: streamWithFallbackMock }))
vi.mock("@/lib/ai/token-logger", () => ({ logAiInvocation: logAiInvocationMock }))

vi.mock("@/lib/ai-providers", () => ({
  cerebras: vi.fn(() => "cerebras-model"),
  getCerebrasModel: vi.fn(() => "gpt-oss-120b"),
}))

// Mock AI SDK with actual implementations but mocked streamText
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>()
  return {
    ...actual,
    streamText: streamTextMock,
    createUIMessageStreamResponse: vi.fn((config: { stream: ReadableStream }) => {
      return new Response(config.stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }),
  }
})

const resource = {
  id: "resource-1",
  title: "Calculus reference",
  description: "Limits and derivatives",
  category: "Mathematics",
  fileUrl: "https://storage.example/calculus.txt",
  fileName: "calculus.txt",
  fileType: "txt",
  aiSourceText: null,
  ownerId: "user-1",
}

function createMockStream(chunks: string[]) {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

describe("API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    limitMock.mockReset()
    orderByLimitMock.mockReset()
    insertChain.returning.mockReset()
    headersMock.mockResolvedValue(new Headers())
    process.env.CEREBRAS_API_KEY = "cerebras-test-key"
    process.env.CEREBRAS_MODEL = "gpt-oss-120b"
  })

  afterEach(() => {
    delete process.env.CEREBRAS_API_KEY
    delete process.env.CEREBRAS_MODEL
  })

  test("ai chat rejects invalid bodies", async () => {
    const { POST } = await import("@/app/api/ai/chat/route")

    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never,
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBeTruthy()
  })

  test("ai chat rejects messages longer than 4,000 characters", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })

    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "x".repeat(4_001), resourceId: "resource-1" }),
      }) as never,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Message must be 4,000 characters or fewer",
    })
  })

  test("ai chat rejects unauthenticated requests", async () => {
    getSessionMock.mockResolvedValueOnce(null)

    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Hello", resourceId: "resource-1" }),
      }) as never,
    )

    expect(response.status).toBe(401)
  })

  test("ai chat enforces the daily rate limit", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    insertChain.returning.mockResolvedValueOnce([{ count: 201 }])

    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Hello", resourceId: "resource-1" }),
      }) as never,
    )

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: "You've reached the daily AI chat limit (200 messages). Please try again tomorrow.",
    })
  })

  test("ai chat streams a response using AI SDK and persists the exchange", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    limitMock
      .mockResolvedValueOnce([resource])
      .mockResolvedValueOnce([{ orgId: "org-1" }])
    insertChain.returning
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ id: "conversation-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    orderByLimitMock.mockResolvedValueOnce([
      {
        id: "saved-message-1",
        role: "user",
        content: "What is a limit?",
        createdAt: new Date("2026-08-07T06:00:00.000Z"),
      },
    ])
    extractResourceTextMock.mockResolvedValueOnce("A derivative measures instantaneous change.")

    // Mock the fallback router's stream response
    const mockTextStream = createMockStream([
      "0:It measures \n",
      "0:instantaneous change.\n",
    ])

    streamWithFallbackMock.mockResolvedValueOnce({
      result: { stream: mockTextStream },
      modelId: "test-model",
      provider: "test",
      attemptedModels: ["test-model"],
      fallbacks: [],
    })

    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "What does a derivative measure?",
          resourceId: "resource-1",
          clientMessageId: "client-message-1",
        }),
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/plain")

    expect(extractResourceTextMock).toHaveBeenCalledWith(resource)
    expect(streamWithFallbackMock).toHaveBeenCalledTimes(1)
    const streamOptions = streamWithFallbackMock.mock.calls[0]?.[0]
    expect(streamOptions).toMatchObject({
      complexity: "simple",
      sensitivity: "org_context",
      temperature: 0.2,
      maxOutputTokens: 1000,
    })
    expect(streamOptions.system).toContain("A derivative measures instantaneous change.")

    // Simulate onFinish callback being called with real usage
    if (streamOptions.onFinish) {
      await streamOptions.onFinish({
        text: "It measures instantaneous change.",
        usage: { inputTokens: 7, outputTokens: 3 },
      })
    }

    expect(updateSetMock).toHaveBeenCalledWith({ aiSourceText: "A derivative measures instantaneous change." })
    expect(logAiInvocationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: expect.any(String),
        taskType: "resource_chat",
        orgId: "org-1",
        inputTokens: 7,
        outputTokens: 3,
        fallbackAttempts: 0,
        attemptedModels: ["test-model"],
      }),
    )
  })

  test("ai chat reuses cached source text without refetching", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    limitMock
      .mockResolvedValueOnce([
        { ...resource, aiSourceText: "Cached source text." },
      ])
      .mockResolvedValueOnce([{ orgId: "org-1" }])
    insertChain.returning
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ id: "conversation-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    orderByLimitMock.mockResolvedValueOnce([])

    const mockTextStream = createMockStream([
      "0:Cached answer.\n",
    ])

    streamWithFallbackMock.mockResolvedValueOnce({
      result: { stream: mockTextStream },
      modelId: "test-model",
      provider: "test",
      attemptedModels: ["test-model"],
      fallbacks: [],
    })

    const { POST } = await import("@/app/api/ai/chat/route")
    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Hello", resourceId: "resource-1" }),
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(extractResourceTextMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()

    const callArgs = streamWithFallbackMock.mock.calls[0]?.[0]
    expect(callArgs.system).toContain("Cached source text.")
  })

  test("user lookup rejects unauthorized requests", async () => {
    getSessionMock.mockResolvedValueOnce(null)

    const { GET } = await import("@/app/api/users/by-email/route")
    const response = await GET(new Request("http://localhost/api/users/by-email?email=test@example.com"))

    expect(response.status).toBe(401)
  })

  test("user lookup validates email input", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })

    const { GET } = await import("@/app/api/users/by-email/route")
    const response = await GET(new Request("http://localhost/api/users/by-email?email=bad-email"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "A valid email is required" })
  })

  test("whiteboard route rejects unauthorized access", async () => {
    getSessionMock.mockResolvedValueOnce(null)

    const { GET } = await import("@/app/api/whiteboards/[whiteboardId]/route")
    const response = await GET(new Request("http://localhost/api/whiteboards/board-1"), {
      params: Promise.resolve({ whiteboardId: "board-1" }),
    })

    if (!response) throw new Error("Expected a response")
    expect(response.status).toBe(401)
  })
})
