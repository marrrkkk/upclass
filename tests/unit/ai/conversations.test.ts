// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
}))

vi.mock("@/db", () => ({
  db: {
    transaction: mocks.transaction,
  },
}))

describe("createConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.returning.mockResolvedValue([
      {
        id: "conversation-1",
        userId: "user-1",
        orgId: "org-1",
        surface: "dashboard",
        entityId: "dashboard",
        title: "New chat",
        isDefault: false,
        lastMessageAt: null,
        createdAt: new Date("2026-08-19T00:00:00Z"),
        updatedAt: new Date("2026-08-19T00:00:00Z"),
      },
    ])
    mocks.values.mockReturnValue({ returning: mocks.returning })
    mocks.insert.mockReturnValue({ values: mocks.values })
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ insert: mocks.insert }),
    )
  })

  test("returns the row inserted inside the transaction", async () => {
    const { createConversation } = await import("@/lib/ai/conversations")

    const conversation = await createConversation({
      userId: "user-1",
      orgId: "org-1",
      surface: "dashboard",
      entityId: "dashboard",
    })

    expect(conversation.id).toBe("conversation-1")
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.returning).toHaveBeenCalledOnce()
  })

  test("rejects an empty insert result instead of returning undefined", async () => {
    mocks.returning.mockResolvedValue([])
    const { createConversation } = await import("@/lib/ai/conversations")

    await expect(
      createConversation({
        userId: "user-1",
        orgId: "org-1",
        surface: "dashboard",
        entityId: "dashboard",
      }),
    ).rejects.toThrow("Conversation insert returned no row")
  })
})
