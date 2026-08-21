import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ResourcesClient } from "@/components/resources/resources-client"
import { ToastProvider } from "@/components/ui/toast"

const mocks = vi.hoisted(() => ({
  getCachedResources: vi.fn(),
  cacheImages: vi.fn(),
  prefetchOnHover: vi.fn(),
  cancelPrefetch: vi.fn(),
}))

vi.mock("@/lib/background-cache", () => ({
  BackgroundCache: {
    getInstance: () => ({
      getCachedResources: mocks.getCachedResources,
    }),
  },
}))

vi.mock("@/lib/background-sync", () => ({
  BackgroundSync: {
    getInstance: () => ({
      cacheImages: mocks.cacheImages,
    }),
  },
}))

vi.mock("@/lib/cache-hooks", () => ({
  useCacheData: vi.fn(),
  useOfflineCollectionCache: (options: {
    getCachedData: () => Promise<unknown[]>
    onHydrate: (data: unknown[]) => void
  }) => {
    options.getCachedData().then((data) => {
      if (data.length > 0) options.onHydrate(data)
    })
  },
}))

vi.mock("@/hooks/use-prefetch", () => ({
  usePrefetch: () => ({
    prefetchOnHover: mocks.prefetchOnHover,
    cancelPrefetch: mocks.cancelPrefetch,
  }),
}))

const resources = [
  {
    id: "resource-1",
    title: "Calculus reference",
    description: "Limits, derivatives, and proofs",
    category: "Mathematics",
    fileUrl: "https://files.example/calculus.pdf",
    fileName: "calculus-reference.pdf",
    fileType: "pdf",
    fileSize: "2048",
    createdAt: "2026-03-01T10:00:00.000Z",
    authorName: "Ada Lovelace",
    authorImage: null,
  },
  {
    id: "resource-2",
    title: "Seminar slides",
    description: "Week four discussion",
    category: "History",
    fileUrl: "https://files.example/seminar.pptx",
    fileName: "seminar-slides.pptx",
    fileType: "pptx",
    fileSize: "4096",
    createdAt: "2026-03-02T10:00:00.000Z",
    authorName: "Grace Hopper",
    authorImage: null,
  },
]

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  })
}

describe("ResourcesClient", () => {
  beforeEach(() => {
    setOnline(true)
    mocks.getCachedResources.mockResolvedValue([])
    mocks.prefetchOnHover.mockClear()
    mocks.cancelPrefetch.mockClear()
  })

  it("renders tenant-aware resource cards and filters by search and grouped file type", async () => {
    const user = userEvent.setup()

    render(
      <ToastProvider>
        <ResourcesClient resources={resources} orgSlug="academy" />
      </ToastProvider>,
    )

    const list = await screen.findByRole("list", { name: "Resources" })
    expect(list).toHaveClass("grid", "sm:grid-cols-2", "xl:grid-cols-3")
    expect(within(list).getAllByRole("listitem")).toHaveLength(2)
    expect(list.querySelectorAll('[data-slot="resource-card"]')).toHaveLength(2)
    const calculusLink = screen.getByRole("link", { name: "Open Calculus reference" })
    expect(calculusLink).toHaveAttribute(
      "href",
      "/academy/resources/resource-1",
    )
    expect(screen.getByRole("link", { name: "Download Calculus reference" })).toHaveAttribute(
      "href",
      "https://files.example/calculus.pdf",
    )

    await user.hover(calculusLink)
    await user.unhover(calculusLink)
    expect(mocks.prefetchOnHover).toHaveBeenCalledWith("/academy/resources/resource-1")
    expect(mocks.cancelPrefetch).toHaveBeenCalledWith("/academy/resources/resource-1")

    await user.type(screen.getByRole("searchbox", { name: "Search resources" }), "derivatives proofs")

    expect(screen.getByRole("link", { name: "Open Calculus reference" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Open Seminar slides" })).not.toBeInTheDocument()

    await user.clear(screen.getByRole("searchbox", { name: "Search resources" }))
    await user.click(screen.getByRole("button", { name: "PowerPoint" }))

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Open Calculus reference" })).not.toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Open Seminar slides" })).toBeInTheDocument()
    })
  })

  it("shows cached resources and a visible status while offline", async () => {
    setOnline(false)
    mocks.getCachedResources.mockResolvedValue([resources[0]])

    render(
      <ToastProvider>
        <ResourcesClient resources={[]} orgSlug="academy" />
      </ToastProvider>,
    )

    expect(
      await screen.findByText("You're offline. Showing resources saved on this device."),
    ).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: "Open Calculus reference" })).toHaveAttribute(
      "href",
      "/academy/resources/resource-1",
    )
  })
})
