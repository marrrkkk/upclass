// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const revalidatePathMock = vi.fn()
const revalidateUserOrgsMock = vi.fn().mockResolvedValue(undefined)
const logActivityMock = vi.fn()
const getOrganizationMembershipMock = vi.fn()
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock, limit: selectLimitMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const insertValuesMock = vi.fn()
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateWhereMock = vi.fn().mockResolvedValue(undefined)
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))

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
    insert: insertMock,
    update: updateMock,
  },
}))

vi.mock("@/lib/activity", () => ({
  logActivity: logActivityMock,
}))

vi.mock("@/lib/org-validation", () => ({
  getOrganizationMembership: getOrganizationMembershipMock,
}))

vi.mock("@/lib/server/revalidate", () => ({
  revalidateUserOrgs: revalidateUserOrgsMock,
}))

describe("resources and messages actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    headersMock.mockResolvedValue(new Headers())
    getSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    })
    insertValuesMock.mockResolvedValue(undefined)
    getOrganizationMembershipMock.mockResolvedValue({ orgId: "org-1", role: "teacher" })
  })

  test("createResource validates required file metadata", async () => {
    const { createResource } = await import("@/app/actions/resources")
    const formData = new FormData()
    formData.append("orgSlug", "school")
    formData.append("title", "Notes")
    formData.append("resourceType", "notes")

    await expect(createResource(formData)).resolves.toEqual({
      success: false,
      error: "File URL is required",
    })
  })

  test("createResource persists valid resources", async () => {
    const { createResource } = await import("@/app/actions/resources")
    const formData = new FormData()
    formData.append("orgSlug", "school")
    formData.append("title", "Notes")
    formData.append("resourceType", "notes")
    formData.append("fileUrl", "https://files.test/notes.pdf")
    formData.append("fileName", "notes.pdf")
    formData.append("fileType", "pdf")

    await expect(createResource(formData)).resolves.toEqual({
      success: true,
    })
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(revalidateUserOrgsMock).toHaveBeenCalledWith("user-1", [
      "resources",
      "home",
      "activity",
    ])
    expect(logActivityMock).toHaveBeenCalledTimes(1)
  })

  test("sendMessage validates message payloads", async () => {
    const { sendMessage } = await import("@/app/actions/messages")

    await expect(sendMessage("user-2", "   ")).resolves.toEqual({
      success: false,
      error: "Message must have content or media",
    })
  })

  test("sendMessage persists valid messages", async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        id: "user-2",
        messageNotifications: true,
        emailNotifications: true,
        pushNotifications: true,
      },
    ])

    const { sendMessage } = await import("@/app/actions/messages")

    await expect(sendMessage("user-2", "Hello there")).resolves.toEqual({
      success: true,
    })
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(revalidateUserOrgsMock).toHaveBeenCalledWith("user-1", ["messages"])
  })
})
