// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const revalidatePathMock = vi.fn()
const logActivityMock = vi.fn()
const insertValuesMock = vi.fn()
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateWhereMock = vi.fn().mockResolvedValue(undefined)
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

const getClassMembershipForUserMock = vi.fn()
const ingestResourceDocumentMock = vi.fn()

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

vi.mock("@/lib/resources/auth", () => ({
  getClassMembershipForUser: getClassMembershipForUserMock,
  getAuthorizedResourceForUser: vi.fn(),
}))

vi.mock("@/lib/resources/ingest", () => ({
  ingestResourceDocument: ingestResourceDocumentMock,
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
    getClassMembershipForUserMock.mockResolvedValue({
      classId: "class-1",
      role: "teacher",
    })
    ingestResourceDocumentMock.mockResolvedValue({ status: "ready" })
  })

  test("createResource validates required class scope", async () => {
    const { createResource } = await import("@/app/actions/resources")
    const formData = new FormData()
    formData.append("title", "Notes")

    await expect(createResource(formData)).resolves.toEqual({
      success: false,
      error: "Class ID is required",
    })
  })

  test("createResource persists valid class resources", async () => {
    const { createResource } = await import("@/app/actions/resources")
    const formData = new FormData()
    formData.append("classId", "class-1")
    formData.append("title", "Notes")
    formData.append("fileName", "notes.pdf")
    formData.append("fileType", "pdf")
    formData.append("mimeType", "application/pdf")
    formData.append("storageBucket", "resource-files")
    formData.append("storagePath", "classes/class-1/resources/notes.pdf")

    await expect(createResource(formData)).resolves.toEqual({
      success: true,
      resourceId: expect.any(String),
      ingestionStatus: "ready",
      warning: undefined,
    })

    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(getClassMembershipForUserMock).toHaveBeenCalledWith("user-1", "class-1")
    expect(ingestResourceDocumentMock).toHaveBeenCalledTimes(1)
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/messages")
  })
})
