// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const revalidatePathMock = vi.fn()
const logActivityMock = vi.fn()
const getOrganizationMembershipMock = vi.fn()
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

vi.mock("@/lib/org-validation", () => ({
  getOrganizationMembership: getOrganizationMembershipMock,
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
    getOrganizationMembershipMock.mockResolvedValue({ orgId: "org-1", role: "owner" })
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
    const { createClass } = await import("@/app/actions/classes")
    const formData = new FormData()
    formData.append("orgSlug", "school")

    await expect(createClass(formData)).resolves.toEqual({
      success: false,
      error: "Title is required",
    })
  })

  test("createClass creates a class for teachers", async () => {
    selectLimitMock.mockResolvedValueOnce([])

    const txInsertValuesMock = vi.fn().mockResolvedValue(undefined)
    const txInsertMock = vi.fn(() => ({ values: txInsertValuesMock }))
    transactionMock.mockImplementationOnce(async (callback) => {
      await callback({
        insert: txInsertMock,
      })
    })

    const { createClass } = await import("@/app/actions/classes")
    const formData = new FormData()
    formData.append("orgSlug", "school")
    formData.append("title", "Math 101")
    formData.append("gradeLevel", "grade_10")
    formData.append("section", "A")

    const result = await createClass(formData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data?.code).toMatch(/^[A-Z0-9]{6}$/)
      expect(result.data?.codeEnabled).toBe(true)
    }
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith("/school/classes")
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
