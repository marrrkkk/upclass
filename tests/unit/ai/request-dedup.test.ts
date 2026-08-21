// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const cacheSetIfAbsentMock = vi.fn()

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheSetIfAbsent: cacheSetIfAbsentMock,
}))

describe("request-dedup", () => {
  let checkDuplicate: typeof import("@/lib/ai/security/request-dedup").checkDuplicate

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import("@/lib/ai/security/request-dedup")
    checkDuplicate = mod.checkDuplicate
  })

  test("first request for a (conversation, message) pair is allowed", async () => {
    cacheSetIfAbsentMock.mockResolvedValueOnce(true)
    const result = await checkDuplicate("conv-1", "what is due this week?")
    expect(result).toEqual({ duplicate: false })
    expect(cacheSetIfAbsentMock).toHaveBeenCalledTimes(1)
  })

  test("a repeat of the same message in the same conversation is a duplicate", async () => {
    cacheSetIfAbsentMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    await checkDuplicate("conv-1", "same message")
    const second = await checkDuplicate("conv-1", "same message")
    expect(second).toEqual({ duplicate: true })
  })

  test("the same message in a different conversation is not a duplicate", async () => {
    cacheSetIfAbsentMock.mockResolvedValue(true)
    await checkDuplicate("conv-1", "shared text")
    const other = await checkDuplicate("conv-2", "shared text")
    expect(other.duplicate).toBe(false)
  })

  test("fails open when the cache is unavailable", async () => {
    cacheSetIfAbsentMock.mockRejectedValueOnce(new Error("cache down"))
    const result = await checkDuplicate("conv-1", "hello")
    expect(result).toEqual({ duplicate: false })
  })
})