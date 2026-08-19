// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"
import { NextRequest } from "next/server"

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const deleteWhereMock = vi.fn()
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }))

vi.mock("@/db", () => ({
  db: { select: selectMock, delete: deleteMock },
}))

function makeRequest(authorization?: string) {
  return new NextRequest(new URL("http://localhost/api/cron/token-log-cleanup"), {
    headers: authorization ? { authorization } : {},
  })
}

describe("GET /api/cron/token-log-cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "cron-test-secret"
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  test("rejects requests without the cron secret configured", async () => {
    delete process.env.CRON_SECRET
    const { GET } = await import("@/app/api/cron/token-log-cleanup/route")
    const response = await GET(makeRequest("Bearer whatever"))
    expect(response.status).toBe(401)
  })

  test("rejects requests with a wrong bearer token", async () => {
    const { GET } = await import("@/app/api/cron/token-log-cleanup/route")
    const response = await GET(makeRequest("Bearer wrong"))
    expect(response.status).toBe(401)
    expect(selectMock).not.toHaveBeenCalled()
  })

  test("deletes expired rows in batches and reports the total", async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: "row-1" }, { id: "row-2" }])
    selectLimitMock.mockResolvedValueOnce([])
    deleteWhereMock.mockResolvedValue(undefined)

    const { GET } = await import("@/app/api/cron/token-log-cleanup/route")
    const response = await GET(makeRequest("Bearer cron-test-secret"))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { success: boolean; deleted: number }
    expect(body.success).toBe(true)
    expect(body.deleted).toBe(2)
    expect(deleteWhereMock).toHaveBeenCalledTimes(1)
  })

  test("stops batching once a batch returns nothing", async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { GET } = await import("@/app/api/cron/token-log-cleanup/route")
    const response = await GET(makeRequest("Bearer cron-test-secret"))
    const body = (await response.json()) as { deleted: number }
    expect(body.deleted).toBe(0)
    expect(deleteWhereMock).not.toHaveBeenCalled()
  })
})