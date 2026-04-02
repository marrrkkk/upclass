// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock, limit: selectLimitMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

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
  },
}))

vi.mock("@/lib/resources/chat", () => ({
  askResourceQuestion: vi.fn(),
  getLatestResourceChatSession: vi.fn().mockResolvedValue({
    sessionId: null,
    messages: [],
  }),
}))

describe("API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    headersMock.mockResolvedValue(new Headers())
  })

  test("ai chat rejects invalid bodies", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-1",
      },
    })

    const { POST } = await import("@/app/api/ai/chat/route")

    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Class ID is required",
    })
  })

  test("user lookup rejects unauthorized requests", async () => {
    getSessionMock.mockResolvedValueOnce(null)

    const { GET } = await import("@/app/api/users/by-email/route")
    const response = await GET(new Request("http://localhost/api/users/by-email?email=test@example.com"))

    expect(response.status).toBe(401)
  })

  test("user lookup validates email input", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-1",
      },
    })

    const { GET } = await import("@/app/api/users/by-email/route")
    const response = await GET(new Request("http://localhost/api/users/by-email?email=bad-email"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "A valid email is required",
    })
  })

  test("whiteboard route rejects unauthorized access", async () => {
    getSessionMock.mockResolvedValueOnce(null)

    const { GET } = await import("@/app/api/whiteboards/[whiteboardId]/route")
    const response = await GET(new Request("http://localhost/api/whiteboards/board-1"), {
      params: Promise.resolve({ whiteboardId: "board-1" }),
    })

    if (!response) {
      throw new Error("Expected a response")
    }

    expect(response.status).toBe(401)
  })
})
