import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { CreateResourceButton, RESOURCE_TYPES } from "@/components/resources/create-resource-button"
import { resourceTypeEnum } from "@/lib/validation/actions"

const mocks = vi.hoisted(() => ({
  createResource: vi.fn(),
  deleteOrphanUpload: vi.fn(),
  startUpload: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock("@/app/actions/resources", () => ({
  createResource: mocks.createResource,
  deleteOrphanUpload: mocks.deleteOrphanUpload,
}))

vi.mock("@/lib/supabase-storage", () => ({
  useSupabaseUpload: () => ({
    startUpload: mocks.startUpload,
    isUploading: false,
  }),
}))

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  })
}

async function selectResourceFile(user: ReturnType<typeof userEvent.setup>) {
  render(<CreateResourceButton mutate={mocks.mutate} pending={false} />)
  await user.click(screen.getByRole("button", { name: /upload/i }))
  const file = new File(["course notes"], "course-notes.pdf", {
    type: "application/pdf",
  })
  await user.upload(screen.getByLabelText(/Resource file/i), file)
  const titleInput = screen.getByLabelText("Resource title")
  await user.clear(titleInput)
  await user.type(titleInput, "Course notes")
  return file
}

describe("CreateResourceButton", () => {
  beforeEach(() => {
    setOnline(true)
    mocks.mutate.mockImplementation((_next: unknown, action: () => Promise<unknown>) => {
      void action()
    })
    mocks.startUpload.mockResolvedValue([
      {
        url: "https://files.example/course-notes.pdf",
        path: "user-1/course-notes.pdf",
        name: "course-notes.pdf",
        size: "12",
        type: "application/pdf",
      },
    ])
    mocks.createResource.mockResolvedValue({ success: true })
  })

  it("blocks file uploads while offline and keeps the error visible", async () => {
    const user = userEvent.setup()
    setOnline(false)
    await selectResourceFile(user)

    await user.click(screen.getByRole("button", { name: "Upload resource" }))

    await waitFor(
      () => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "File uploads require an internet connection",
        )
      },
      { timeout: 10_000 },
    )
    expect(mocks.startUpload).not.toHaveBeenCalled()
  }, 15_000)

  it("shows storage upload errors without attempting resource creation", async () => {
    const user = userEvent.setup()
    mocks.startUpload.mockRejectedValue(new Error("Storage upload failed"))
    await selectResourceFile(user)

    await user.click(screen.getByRole("button", { name: "Upload resource" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Storage upload failed")
  })

  it("preserves uploaded file metadata when creating the resource", async () => {
    const user = userEvent.setup()
    await selectResourceFile(user)

    await user.click(screen.getByRole("button", { name: "Upload resource" }))

await waitFor(() => expect(mocks.createResource).toHaveBeenCalledOnce())
    const formData = mocks.createResource.mock.calls[0][0] as FormData
    expect(formData.get("fileUrl")).toBe("https://files.example/course-notes.pdf")
    expect(formData.get("storagePath")).toBe("user-1/course-notes.pdf")
    expect(formData.get("fileType")).toBe("pdf")
    expect(formData.get("resourceType")).toBe("other")
    expect(formData.getAll("resourceType")).toEqual(["other"])
  })

  it("only offers resource type values accepted by the server schema", () => {
    for (const resourceType of RESOURCE_TYPES) {
      expect(resourceTypeEnum.safeParse(resourceType.value).success).toBe(true)
    }
  })
})
