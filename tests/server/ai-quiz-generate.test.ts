// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const insertReturningMock = vi.fn()
const insertChain = {
  values: vi.fn(() => insertChain),
  onConflictDoUpdate: vi.fn(() => insertChain),
  returning: insertReturningMock,
}
const insertMock = vi.fn(() => insertChain)
const extractResourceTextMock = vi.fn()

// Mock AI SDK's generateText
const generateTextMock = vi.fn()

vi.mock("next/headers", () => ({ headers: headersMock }))
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}))
vi.mock("@/db", () => ({ db: { select: selectMock, insert: insertMock } }))
vi.mock("@/lib/resource-text-extraction", () => ({
  ExtractionError: class ExtractionError extends Error {},
  extractResourceText: extractResourceTextMock,
}))
vi.mock("@/lib/ai-providers", () => ({
  cerebras: vi.fn(() => "cerebras-model"),
  getCerebrasModel: vi.fn(() => "llama-3.3-70b"),
}))
vi.mock("ai", () => ({
  generateText: generateTextMock,
}))

const requestBody = {
  classId: "class-1",
  instructions: "Create a short formative assessment.",
  files: [
    {
      name: "lesson.txt",
      url: "https://project.supabase.co/storage/v1/object/public/resources/user-1/lesson.txt",
    },
  ],
}

describe("AI quiz generation API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    selectLimitMock.mockReset()
    insertReturningMock.mockReset()
    headersMock.mockResolvedValue(new Headers())
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
  })

  test("rejects students before extracting reference files", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "student-1" } })
    insertReturningMock.mockResolvedValueOnce([{ count: 1 }])
    selectLimitMock.mockResolvedValueOnce([])

    const { POST } = await import("@/app/api/ai/quizzes/generate/route")
    const response = await POST(
      new Request("http://localhost/api/ai/quizzes/generate", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }) as never,
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "Only teachers can generate quizzes" })
    expect(extractResourceTextMock).not.toHaveBeenCalled()
  })

  test("enforces the daily generation rate limit", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "teacher-1" } })
    insertReturningMock.mockResolvedValueOnce([{ count: 21 }])

    const { POST } = await import("@/app/api/ai/quizzes/generate/route")
    const response = await POST(
      new Request("http://localhost/api/ai/quizzes/generate", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }) as never,
    )

    expect(response.status).toBe(429)
    expect(selectMock).not.toHaveBeenCalled()
  })

  test("grounds generation in a teacher-owned file and normalizes AI questions", async () => {
    process.env.CEREBRAS_API_KEY = "test-key"
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    insertReturningMock.mockResolvedValueOnce([{ count: 1 }])
    selectLimitMock.mockResolvedValueOnce([{ id: "membership-1" }])
    selectLimitMock.mockResolvedValueOnce([{ orgId: "org-1" }])
    extractResourceTextMock.mockResolvedValueOnce("Plants use photosynthesis to make food.")
    
    // Mock AI SDK generateText response
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        title: "Plant science check",
        description: "A short formative assessment.",
        questions: [
          {
            prompt: "What process helps plants make food?",
            type: "single_choice",
            points: 2,
            options: [
              { text: "Photosynthesis", isCorrect: true },
              { text: "Respiration", isCorrect: false },
            ],
          },
          {
            prompt: "Plants make food.",
            type: "true_false",
            points: 1,
            options: [{ text: "False", isCorrect: true }],
          },
        ],
      }),
    })

    const { POST } = await import("@/app/api/ai/quizzes/generate/route")
    const response = await POST(
      new Request("http://localhost/api/ai/quizzes/generate", {
        method: "POST",
        body: JSON.stringify(requestBody),
      }) as never,
    )

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.quiz.questions[1].options).toEqual([
      { text: "True", isCorrect: false },
      { text: "False", isCorrect: true },
    ])
    expect(extractResourceTextMock).toHaveBeenCalledWith({
      fileUrl: requestBody.files[0].url,
      fileType: "txt",
    })
    
    // Check that generateText was called with the correct parameters
    expect(generateTextMock).toHaveBeenCalledTimes(1)
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "cerebras-model",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
          }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("Plants use photosynthesis"),
          }),
        ]),
        maxOutputTokens: 4000,
      }),
    )
    
    delete process.env.CEREBRAS_API_KEY
  })
})
