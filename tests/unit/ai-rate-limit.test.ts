// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"
import type * as AiRateLimit from "@/lib/ai-rate-limit"

const insertChain = {
  values: vi.fn(() => insertChain),
  onConflictDoUpdate: vi.fn(() => insertChain),
  returning: vi.fn(),
}
const insertMock = vi.fn(() => insertChain)

vi.mock("@/db", () => ({
  db: { insert: insertMock },
}))

describe("enforceAIRateLimit", () => {
  let enforceAIRateLimit: typeof AiRateLimit.enforceAIRateLimit

  beforeEach(async () => {
    vi.clearAllMocks()
    insertChain.returning.mockReset()
    ;({ enforceAIRateLimit } = await import("@/lib/ai-rate-limit"))
  })

  test("allows usage under the daily limit", async () => {
    insertChain.returning.mockResolvedValueOnce([{ count: 5 }])

    await expect(enforceAIRateLimit("user-1", "chat")).resolves.toEqual({
      allowed: true,
      dailyLimit: 200,
    })
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", scope: "chat" }),
    )
  })

  test("rejects usage over the daily limit", async () => {
    insertChain.returning.mockResolvedValueOnce([{ count: 201 }])

    await expect(enforceAIRateLimit("user-1", "chat")).resolves.toEqual({
      allowed: false,
      dailyLimit: 200,
    })
  })

  test("rejects chat bursts above the per-minute window", async () => {
    insertChain.returning.mockResolvedValue([{ count: 1 }])

    for (let i = 0; i < 10; i++) {
      await expect(enforceAIRateLimit("burst-user", "chat")).resolves.toMatchObject({
        allowed: true,
      })
    }

    await expect(enforceAIRateLimit("burst-user", "chat")).resolves.toMatchObject({
      allowed: false,
    })
    expect(insertMock).toHaveBeenCalledTimes(10)
  })
})