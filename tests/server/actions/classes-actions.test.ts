// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const revalidatePathMock = vi.fn()
const logActivityMock = vi.fn()
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock, limit: selectLimitMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const transactionMock = vi.fn()

vi.mock("next/headers", () => ({
  headers: headersMock,
}))

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
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
    transaction: transactionMock,
  },
}))

vi.mock("@/lib/activity", () => ({
  logActivity: logActivityMock,
}))

describe("classes actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    headersMock.mockResolvedValue(new Headers())
    getSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    })
  })

  test("createClass rejects unauthorized requests", async () => {
    getSessionMock.mockResolvedValueOnce(null)

    const { createClass } = await import("@/app/actions/classes")
    const formData = new FormData()
    formData.append("title", "Math 101")

    await expect(createClass(formData)).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    })
  })

  test("createClass rejects invalid input after auth", async () => {
    selectLimitMock.mockResolvedValueOnce([{ role: "teacher" }])

    const { createClass } = await import("@/app/actions/classes")
    const formData = new FormData()

    await expect(createClass(formData)).resolves.toEqual({
      success: false,
      error: "Title is required",
    })
  })

  test("createClass creates a class for teachers", async () => {
    selectLimitMock
      .mockResolvedValueOnce([{ role: "teacher" }])
      .mockResolvedValueOnce([])

    const txInsertValuesMock = vi.fn().mockResolvedValue(undefined)
    const txInsertMock = vi.fn(() => ({ values: txInsertValuesMock }))
    transactionMock.mockImplementationOnce(async (callback) => {
      await callback({
        insert: txInsertMock,
      })
    })

    const { createClass } = await import("@/app/actions/classes")
    const formData = new FormData()
    formData.append("title", "Math 101")
    formData.append("category", "Math")

    await expect(createClass(formData)).resolves.toEqual({
      success: true,
    })
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith("/classes")
    expect(logActivityMock).toHaveBeenCalledTimes(1)
  })

  test("joinClass rejects invalid codes via schema validation", async () => {
    const { joinClass } = await import("@/app/actions/classes")
    const formData = new FormData()

    await expect(joinClass(formData)).resolves.toEqual({
      success: false,
      error: "Class code is required",
    })
  })
})
