import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ResourceDetailClient } from "@/components/resources/resource-detail-client"
import { ToastProvider } from "@/components/ui/toast"

const mocks = vi.hoisted(() => ({
  deleteResource: vi.fn(),
  updateResource: vi.fn(),
  setPageTitle: vi.fn(),
}))

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}))

vi.mock("@/app/actions/resources", () => ({
  deleteResource: mocks.deleteResource,
  updateResource: mocks.updateResource,
}))

vi.mock("@/app/actions/learn", () => ({
  createStudyCollectionFromResource: vi.fn(),
}))

vi.mock("@/stores/page-header-store", () => ({
  usePageHeaderStore: () => mocks.setPageTitle,
}))

vi.mock("@/components/ai/ai-panel-provider", () => ({
  useAiPanel: () => ({ setContext: vi.fn(), clearSeed: vi.fn(), openFor: vi.fn() }),
}))

const resource = {
  id: "resource-1",
  title: "Calculus reference",
  description: "Limits, derivatives, and proofs",
  resourceType: "reading_material",
  classId: null,
  category: "Mathematics",
  fileUrl: "https://files.example/calculus.pdf",
  fileName: "calculus-reference.pdf",
  fileType: "pdf",
  fileSize: "2048",
  ownerId: "user-1",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-02T11:00:00.000Z",
  owner: {
    id: "user-1",
    name: "Ada Lovelace",
    image: null,
    email: "ada@example.com",
  },
}

describe("ResourceDetailClient", () => {
  beforeEach(() => {
    mocks.updateResource.mockResolvedValue({ success: true })
    mocks.deleteResource.mockResolvedValue({ success: true })
  })

  it("renders a compact preview, file metadata, and the tenant-aware owner link", async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    render(
      <ToastProvider>
        <ResourceDetailClient resource={resource} isOwner orgSlug="academy" />
      </ToastProvider>,
    )

    expect(screen.getByText("Limits, derivatives, and proofs")).toHaveClass(
      "whitespace-pre-wrap",
    )
    expect(
      screen.getByRole("heading", { name: "Calculus reference", level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByTitle("calculus-reference.pdf")).toHaveAttribute(
      "src",
      "https://files.example/calculus.pdf",
    )
    expect(screen.queryByText("Word document")).not.toBeInTheDocument()
    expect(screen.getByText("2.00 KB")).toBeInTheDocument()

    const ownerLink = screen.getByRole("link", { name: /Ada Lovelace/i })
    expect(ownerLink).toHaveAttribute("href", "/academy/user/user-1")

    await user.click(screen.getByRole("button", { name: /Download/i }))
    expect(openSpy).toHaveBeenCalledWith("https://files.example/calculus.pdf", "_blank")

    openSpy.mockRestore()
  })

  it("keeps one canonical download action, shows the AI outline fallback, and hides mutation controls from non-owners", async () => {
    // Summary generation unavailable → card degrades to the plain fallback.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"))

    render(
      <ToastProvider>
        <ResourceDetailClient
          resource={{
            ...resource,
            fileName: "seminar-slides.pptx",
            fileType: "pptx",
            fileUrl: "https://files.example/seminar.pptx",
          }}
          isOwner={false}
          orgSlug="academy"
        />
      </ToastProvider>,
    )

    expect(await screen.findByText(/cannot be previewed directly/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Ask AI/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Make study set/i })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Download/i })).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Download file" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete Calculus reference" })).not.toBeInTheDocument()

    fetchSpy.mockRestore()
  })

it("serves legacy app-route file URLs through the canonical file endpoint", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    render(
      <ToastProvider>
        <ResourceDetailClient
          resource={{
            ...resource,
            id: "legacy-1",
            fileUrl: "/academy/resources/legacy-1",
          }}
          isOwner={false}
          orgSlug="academy"
        />
      </ToastProvider>,
    )

    expect(screen.getByTitle("calculus-reference.pdf")).toHaveAttribute(
      "src",
      "/api/resources/legacy-1/file",
    )

    const download = screen.getByRole("button", { name: /Download/i })
    download.click()
    expect(openSpy).toHaveBeenCalledWith("/api/resources/legacy-1/file", "_blank")

    openSpy.mockRestore()
  })

it("keeps edit action errors visible in the dialog", async () => {
    const user = userEvent.setup()
    mocks.updateResource.mockResolvedValue({ success: false, error: "Unable to save resource" })

    render(
      <ToastProvider>
        <ResourceDetailClient resource={resource} isOwner orgSlug="academy" />
      </ToastProvider>,
    )

    await user.click(screen.getByRole("button", { name: "More actions" }))
    await user.click(await screen.findByRole("menuitem", { name: "Edit resource" }))
    await user.clear(screen.getByLabelText("Title"))
    await user.type(screen.getByLabelText("Title"), "Updated calculus reference")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(
      () => {
        expect(screen.getByText("Couldn't save changes")).toBeInTheDocument()
        expect(screen.getByText("Unable to save resource")).toBeInTheDocument()
      },
      { timeout: 10_000 },
    )
    await waitFor(() => expect(mocks.updateResource).toHaveBeenCalledOnce())

    const formData = mocks.updateResource.mock.calls[0][0] as FormData
    expect(formData.get("id")).toBe("resource-1")
    expect(formData.get("title")).toBe("Updated calculus reference")

    // The optimistic change rolls back on failure (dialog stays open for retry).
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Save changes" })).not.toHaveAttribute(
          "data-loading",
        )
      },
      { timeout: 10_000 },
    )
    await user.click(screen.getByRole("button", { name: "Cancel" }))
expect(
      screen.getByRole("heading", { name: "Calculus reference", level: 1 }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Updated calculus reference")).not.toBeInTheDocument()
  }, 15_000)
})
