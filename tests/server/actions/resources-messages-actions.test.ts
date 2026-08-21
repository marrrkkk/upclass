// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"

const getSessionMock = vi.fn()
const headersMock = vi.fn()
const revalidatePathMock = vi.fn()
const revalidateUserOrgsMock = vi.fn().mockResolvedValue(undefined)
const logActivityMock = vi.fn()
const getOrganizationMembershipMock = vi.fn()
const removeStorageObjectMock = vi.fn().mockResolvedValue(undefined)
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock, limit: selectLimitMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const insertValuesMock = vi.fn()
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateWhereMock = vi.fn().mockResolvedValue(undefined)
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const deleteWhereMock = vi.fn().mockResolvedValue(undefined)
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }))

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
    delete: deleteMock,
  },
}))

vi.mock("@/lib/storage", () => ({
  removeStorageObject: removeStorageObjectMock,
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

  describe("createResource storage cleanup", () => {
    function resourceFormData(overrides: Record<string, string> = {}) {
      const formData = new FormData()
      formData.append("orgSlug", "school")
      formData.append("title", "Notes")
      formData.append("resourceType", "notes")
      formData.append("fileUrl", "https://files.test/notes.pdf")
      formData.append("fileName", "notes.pdf")
      formData.append("fileType", "pdf")
      for (const [key, value] of Object.entries(overrides)) {
        formData.append(key, value)
      }
      return formData
    }

    test("removes the uploaded file from storage when the database insert fails", async () => {
      insertValuesMock.mockRejectedValueOnce(new Error("database unavailable"))
      const { createResource } = await import("@/app/actions/resources")

      const result = await createResource(
        resourceFormData({ storagePath: "user-1/notes-abc.pdf" }),
      )

      expect(result).toEqual({ success: false, error: "Failed to create resource" })
      expect(insertMock).toHaveBeenCalledTimes(1)
      expect(removeStorageObjectMock).toHaveBeenCalledWith(
        "resources",
        "user-1/notes-abc.pdf",
      )
      expect(revalidateUserOrgsMock).not.toHaveBeenCalled()
    })

    test("drops storage paths outside the uploader folder and never cleans them up", async () => {
      let capturedValues: Record<string, unknown> | null = null
      insertValuesMock.mockImplementation((values: unknown) => {
        capturedValues = (values as Record<string, unknown> | null | undefined) ?? null
        return Promise.resolve()
      })
      const { createResource } = await import("@/app/actions/resources")

      const result = await createResource(
        resourceFormData({ storagePath: "user-2/notes-abc.pdf" }),
      )

      expect(result).toEqual({ success: true })
      expect((capturedValues as Record<string, unknown> | null)?.storagePath).toBeNull()
      expect(removeStorageObjectMock).not.toHaveBeenCalled()
    })

    test("rejects traversal-style storage paths before they reach the database", async () => {
      const { createResource } = await import("@/app/actions/resources")

      const result = await createResource(
        resourceFormData({ storagePath: "../../etc/passwd" }),
      )

      expect(result).toEqual({ success: false, error: "Storage path must be a bucket-relative object path" })
      expect(insertMock).not.toHaveBeenCalled()
      expect(removeStorageObjectMock).not.toHaveBeenCalled()
    })

    test("reports success when only post-insert activity logging fails", async () => {
      insertValuesMock.mockResolvedValueOnce(undefined)
      logActivityMock.mockRejectedValueOnce(new Error("activity service down"))
      const { createResource } = await import("@/app/actions/resources")

      const result = await createResource(
        resourceFormData({ storagePath: "user-1/notes-abc.pdf" }),
      )

      expect(result).toEqual({ success: true })
      expect(insertMock).toHaveBeenCalledTimes(1)
      expect(removeStorageObjectMock).not.toHaveBeenCalled()
    })
  })

  describe("deleteResource storage cleanup", () => {
    function existingResource(storagePath: string | null) {
      return [
        {
          id: "resource-1",
          ownerId: "user-1",
          orgId: "org-1",
          storagePath,
        },
      ]
    }

    test("removes the stored object with its full bucket-relative path", async () => {
      selectLimitMock.mockResolvedValueOnce(existingResource("user-1/notes-abc.pdf"))
      const { deleteResource } = await import("@/app/actions/resources")

      const result = await deleteResource("resource-1")

      expect(result).toEqual({ success: true })
      expect(deleteMock).toHaveBeenCalledTimes(1)
      expect(removeStorageObjectMock).toHaveBeenCalledWith(
        "resources",
        "user-1/notes-abc.pdf",
      )
    })

    test("never removes objects outside the owner folder", async () => {
      selectLimitMock.mockResolvedValueOnce(existingResource("user-2/notes-abc.pdf"))
      const { deleteResource } = await import("@/app/actions/resources")

      const result = await deleteResource("resource-1")

      expect(result).toEqual({ success: true })
      expect(removeStorageObjectMock).not.toHaveBeenCalled()
    })

    test("leaves legacy truncated storage paths untouched", async () => {
      selectLimitMock.mockResolvedValueOnce(existingResource("notes-abc.pdf"))
      const { deleteResource } = await import("@/app/actions/resources")

      const result = await deleteResource("resource-1")

      expect(result).toEqual({ success: true })
      expect(removeStorageObjectMock).not.toHaveBeenCalled()
    })
  })
})
