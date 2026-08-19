// @vitest-environment node

/**
 * Regression tests for the assistant route's model-view message construction
 * (5.1): the just-persisted user message must reach the model exactly once —
 * neither dropped (silent answer loss) nor duplicated (double instructions).
 */
import { beforeEach, describe, expect, test, vi } from "vitest"

// Imported once at collection time: the route's module graph is heavy, and
// importing it inside the first test can exceed the per-test timeout when
// the full suite compiles files in parallel.
import { POST as assistantPOST } from "@/app/api/ai/assistant/route"

const {
  getSessionMock,
  headersMock,
  cacheIncrementMock,
  checkDuplicateMock,
  sanitizeAiInputMock,
  orchestrateMock,
  streamWithFallbackMock,
  insertUserMessageMock,
  insertAssistantMessageMock,
  updateAssistantMessageMock,
  failAssistantMessageMock,
  getAuthorizedAiConversationMock,
  getOrgRoleForUserMock,
  resolveAiSurfaceAccessMock,
  getOrganizationMembershipMock,
  logAiInvocationMock,
  checkAssistantBudgetMock,
  recordAssistantTurnMock,
  // db chain: getOrgName (select → from → where → limit) and
  // getLatestUserMessage (select → from → where → orderBy → limit).
  selectLimitMock,
  selectOrderByMock,
  selectWhereMock,
  selectFromMock,
  selectMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  headersMock: vi.fn(),
  cacheIncrementMock: vi.fn(),
  checkDuplicateMock: vi.fn(),
  sanitizeAiInputMock: vi.fn(),
  orchestrateMock: vi.fn(),
  streamWithFallbackMock: vi.fn(),
  insertUserMessageMock: vi.fn(),
  insertAssistantMessageMock: vi.fn(),
  updateAssistantMessageMock: vi.fn(),
  failAssistantMessageMock: vi.fn(),
  getAuthorizedAiConversationMock: vi.fn(),
  getOrgRoleForUserMock: vi.fn(),
  resolveAiSurfaceAccessMock: vi.fn(),
  getOrganizationMembershipMock: vi.fn(),
  logAiInvocationMock: vi.fn(),
  checkAssistantBudgetMock: vi.fn(),
  recordAssistantTurnMock: vi.fn(),
  selectLimitMock: vi.fn(),
  selectOrderByMock: vi.fn(() => ({ limit: selectLimitMock })),
  selectWhereMock: vi.fn(() => ({ orderBy: selectOrderByMock, limit: selectLimitMock })),
  selectFromMock: vi.fn(() => ({ where: selectWhereMock })),
  selectMock: vi.fn(() => ({ from: selectFromMock })),
}))

vi.mock("next/headers", () => ({ headers: headersMock }))
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: getSessionMock } } }))
vi.mock("@/lib/org-validation", () => ({
  getOrganizationMembership: getOrganizationMembershipMock,
}))
vi.mock("@/db", () => ({ db: { select: selectMock } }))
vi.mock("@/lib/ai/access", () => ({
  conversationMatchesSurface: vi.fn(() => true),
  getAuthorizedAiConversation: getAuthorizedAiConversationMock,
  getOrgRoleForUser: getOrgRoleForUserMock,
  resolveAiSurfaceAccess: resolveAiSurfaceAccessMock,
}))
vi.mock("@/lib/ai/conversations", () => ({
  insertUserMessage: insertUserMessageMock,
  insertAssistantMessage: insertAssistantMessageMock,
  updateAssistantMessage: updateAssistantMessageMock,
  failAssistantMessage: failAssistantMessageMock,
}))
vi.mock("@/lib/ai/cache-layer", () => ({ cacheIncrement: cacheIncrementMock }))
vi.mock("@/lib/ai/assistant-usage", () => ({
  checkAssistantBudget: checkAssistantBudgetMock,
  MAX_STEPS_PER_TURN: 6,
  recordAssistantTurn: recordAssistantTurnMock,
}))
vi.mock("@/lib/ai/security/input-sanitizer", () => ({
  sanitizeAiInput: sanitizeAiInputMock,
}))
vi.mock("@/lib/ai/security/request-dedup", () => ({
  checkDuplicate: checkDuplicateMock,
}))
vi.mock("@/lib/ai/orchestrator", () => ({ orchestrate: orchestrateMock }))
vi.mock("@/lib/ai/router", () => ({ streamWithFallback: streamWithFallbackMock }))
vi.mock("@/lib/ai/token-logger", () => ({ logAiInvocation: logAiInvocationMock }))
vi.mock("ai", () => ({
  tool: vi.fn((definition: unknown) => definition),
  convertToModelMessages: vi.fn(async (messages: unknown) => messages),
  createUIMessageStreamResponse: vi.fn(() => new Response("ok", { status: 200 })),
  toUIMessageStream: vi.fn(({ stream }: { stream: unknown }) => stream),
  stepCountIs: vi.fn(() => undefined),
}))

const conversation = {
  id: "conv-1",
  userId: "user-1",
  orgId: "org-1",
  surface: "dashboard",
  entityId: "global",
  title: "Test",
  isDefault: false,
  lastMessageAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseBody = {
  messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "Hello there" }] }],
  orgSlug: "acme",
  conversationId: "conv-1",
  surface: "dashboard",
  entityId: "global",
  clientMessageId: "client-1",
}

const emptyStream = {
  [Symbol.asyncIterator]: async function* () {
    /* not consumed — createUIMessageStreamResponse is mocked */
  },
}

function expectSingleUserMessage(messages: Array<{ role: string; parts: Array<{ type: string; text?: string }> }>) {
  const userMessages = messages.filter((message) => message.role === "user")
  expect(userMessages).toHaveLength(1)
  expect(userMessages[0].parts[0]).toMatchObject({ type: "text", text: "Sanitized hello" })
  expect(messages[messages.length - 1]).toBe(userMessages[0])
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) so once-queued mock values left over
  // from a failed/hung test can never leak into the next one.
  vi.resetAllMocks()
  headersMock.mockResolvedValue(new Headers())
  getSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  getOrganizationMembershipMock.mockResolvedValue({ orgId: "org-1", role: "admin" })
  getAuthorizedAiConversationMock.mockResolvedValue(conversation)
  getOrgRoleForUserMock.mockResolvedValue("admin")
  resolveAiSurfaceAccessMock.mockResolvedValue({ allowed: true, role: "teacher" })
  cacheIncrementMock.mockResolvedValue(1)
  checkDuplicateMock.mockResolvedValue({ duplicate: false })
  sanitizeAiInputMock.mockResolvedValue({ status: "clean", output: "Sanitized hello" })
  selectLimitMock.mockResolvedValue([{ name: "Acme Org" }])
  insertAssistantMessageMock.mockResolvedValue({ id: "assistant-msg-1" })
  updateAssistantMessageMock.mockResolvedValue(undefined)
  failAssistantMessageMock.mockResolvedValue(undefined)
  logAiInvocationMock.mockResolvedValue(undefined)
  checkAssistantBudgetMock.mockResolvedValue({ allowed: true, reason: null })
  recordAssistantTurnMock.mockResolvedValue(undefined)
  streamWithFallbackMock.mockResolvedValue({
    result: { stream: emptyStream },
    modelId: "test-model",
    provider: "test",
    attemptedModels: ["test-model"],
    fallbacks: [],
  })
  orchestrateMock.mockResolvedValue({
    intent: "general_question",
    toolNames: [],
    outputTokens: 200,
    memories: [],
    usedRag: false,
    summary: "",
    history: [],
    compressed: false,
    systemPrompt: "system",
    promptTokens: 10,
    canaryToken: "c4n4ry",
    stageMs: {},
    totalMs: 2,
    sensitivity: "org_context",
  })
})

describe("assistant route — model-view message construction", () => {
  test("the persisted user message is not sent to the model twice", async () => {
    // The orchestrator's history already contains the message inserted this
    // turn (getRecentMessages reads committed rows).
    insertUserMessageMock.mockResolvedValue({ id: "user-msg-inserted", content: "Hello there" })
    orchestrateMock.mockResolvedValueOnce({
      intent: "general_question",
      toolNames: [],
      outputTokens: 200,
      memories: [],
      usedRag: false,
      summary: "",
      history: [
        { id: "older-assistant", role: "assistant", content: "Hi!" },
        { id: "user-msg-inserted", role: "user", content: "Hello there" },
      ],
      compressed: false,
      systemPrompt: "system",
      promptTokens: 10,
      canaryToken: "c4n4ry",
      stageMs: {},
      totalMs: 2,
      sensitivity: "org_context",
    })

    const response = await assistantPOST(
      new Request("http://localhost/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify(baseBody),
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(insertUserMessageMock).toHaveBeenCalledTimes(1)

    const [options] = streamWithFallbackMock.mock.calls[0]
    const modelMessages = options.messages
    // Older history kept intact (just the assistant row), the inserted row
    // was dropped, and the sanitized message appended exactly once.
    expect(modelMessages).toHaveLength(2)
    expect(modelMessages[0]).toMatchObject({ role: "assistant", parts: expect.any(Array) })
    // The inserted row was dropped, the sanitized message appended once.
    expect(modelMessages[1].id).not.toBe("user-msg-inserted")
    expectSingleUserMessage(modelMessages)
  })

  test("replyToExisting reuses the stored message without duplicating it", async () => {
getOrganizationMembershipMock.mockResolvedValue({ orgId: "org-1", role: "admin" })
    // getLatestUserMessage runs first (before orchestration), then getOrgName
    // is awaited inside the orchestrate() call arguments.
    selectLimitMock
      .mockResolvedValueOnce([{ id: "existing-user-msg", content: "Hello there" }])
      .mockResolvedValueOnce([{ name: "Acme Org" }])
    orchestrateMock.mockResolvedValueOnce({
      intent: "general_question",
      toolNames: [],
      outputTokens: 200,
      memories: [],
      usedRag: false,
      summary: "",
      history: [{ id: "existing-user-msg", role: "user", content: "Hello there" }],
      compressed: false,
      systemPrompt: "system",
      promptTokens: 10,
      canaryToken: "c4n4ry",
      stageMs: {},
      totalMs: 2,
      sensitivity: "org_context",
    })

    const response = await assistantPOST(
      new Request("http://localhost/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify({ ...baseBody, replyToExisting: true }),
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(insertUserMessageMock).not.toHaveBeenCalled()

    const [options] = streamWithFallbackMock.mock.calls[0]
    expect(options.messages).toHaveLength(1)
    expect(options.messages[0].id).not.toBe("existing-user-msg")
    expectSingleUserMessage(options.messages)
  })

  test("a plain turn with no prior history sends the user message exactly once", async () => {
    insertUserMessageMock.mockResolvedValue({ id: "user-msg-inserted", content: "Hello there" })

    const response = await assistantPOST(
      new Request("http://localhost/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify(baseBody),
      }) as never,
    )

    expect(response.status).toBe(200)
    const [options] = streamWithFallbackMock.mock.calls[0]
    expect(options.messages).toHaveLength(1)
    expectSingleUserMessage(options.messages)
  })

  test("duplicate requests are rejected with 409 and never reach the model", async () => {
    checkDuplicateMock.mockResolvedValue({ duplicate: true })

    const response = await assistantPOST(
      new Request("http://localhost/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify(baseBody),
      }) as never,
    )

    expect(response.status).toBe(409)
    expect(streamWithFallbackMock).not.toHaveBeenCalled()
    expect(orchestrateMock).not.toHaveBeenCalled()
  })

  test("usage logging carries the runId and real token counts", async () => {
    insertUserMessageMock.mockResolvedValue({ id: "user-msg-inserted", content: "Hello there" })
    streamWithFallbackMock.mockResolvedValueOnce({
      result: { stream: emptyStream },
      modelId: "test-model",
      provider: "test",
      attemptedModels: ["test-model"],
      fallbacks: [{ from: "a", to: "b", error: "x" }],
      onFinish: undefined,
    })

    const response = await assistantPOST(
      new Request("http://localhost/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify(baseBody),
      }) as never,
    )

    expect(response.status).toBe(200)
    // The route passes onFinish; fire it with real usage to verify logging.
    const [options] = streamWithFallbackMock.mock.calls[0]
    expect(typeof options.onFinish).toBe("function")
    await options.onFinish({ text: "Done", usage: { inputTokens: 12, outputTokens: 34 } })

    const invocation = logAiInvocationMock.mock.calls[0][0]
    expect(invocation.taskType).toBe("assistant_message")
    expect(invocation.inputTokens).toBe(12)
    expect(invocation.outputTokens).toBe(34)
    expect(invocation.fallbackAttempts).toBe(1)
    expect(invocation.runId).toEqual(expect.any(String))
    expect(invocation.attemptedModels).toEqual(["test-model"])
  })
})
