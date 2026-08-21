import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"

import { useOrganizations } from "@/hooks/use-organizations"
import { useOrgStore } from "@/stores/org-store"
import type { OrganizationSummary } from "@/types/organization"

const organizations: OrganizationSummary[] = [
  { id: "org-1", slug: "academy", name: "Academy", role: "owner", memberCount: 12 },
  { id: "org-2", slug: "north-academy", name: "North Academy", role: "member", memberCount: 5 },
]

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe("useOrganizations", () => {
  beforeEach(() => {
    useOrgStore.setState({ currentOrg: null })
    vi.restoreAllMocks()
  })

  it("loads the organization list from the API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: organizations }),
    } as Response)

    const { result } = renderHook(() => useOrganizations(), { wrapper })

    await waitFor(() => {
      expect(result.current.organizations).toHaveLength(2)
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.organizations[0]?.slug).toBe("academy")
  })

  it("auto-selects the first organization when nothing is selected yet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: organizations }),
    } as Response)

    renderHook(() => useOrganizations(), { wrapper })

    await waitFor(() => {
      expect(useOrgStore.getState().currentOrg?.slug).toBe("academy")
    })
  })

  it("keeps an existing organization selection", async () => {
    useOrgStore.setState({ currentOrg: organizations[1] })
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: organizations }),
    } as Response)

    const { result } = renderHook(() => useOrganizations(), { wrapper })

    await waitFor(() => {
      expect(result.current.currentOrg?.slug).toBe("north-academy")
    })
  })

  it("surfaces API failures as an empty list", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      statusText: "Unauthorized",
    } as Response)

    const { result } = renderHook(() => useOrganizations(), { wrapper })

    await waitFor(() => {
      expect(result.current.organizations).toEqual([])
    })
  })
})