import { act, render, screen } from "@testing-library/react"

import { OfflineIndicator } from "@/components/offline-indicator"
import { SyncManager } from "@/lib/sync-manager"

describe("OfflineIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("shows the offline message and exposes a dismiss button", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)

    render(<OfflineIndicator />)

    expect(
      screen.getByText(/you are offline\. using cached data\. changes will sync when connection is restored\./i),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /dismiss offline status message/i })).toBeInTheDocument()
  })

  it("switches to syncing and then back online when connectivity returns", async () => {
    const syncPendingActions = vi
      .spyOn(SyncManager.getInstance(), "syncPendingActions")
      .mockResolvedValue(undefined)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    })

    const onLineSpy = vi.spyOn(navigator, "onLine", "get")
    onLineSpy.mockReturnValue(false)
    vi.stubGlobal("fetch", fetchMock)

    render(<OfflineIndicator />)

    expect(screen.getByText(/you are offline\. using cached data\./i)).toBeInTheDocument()

    onLineSpy.mockReturnValue(true)

    await act(async () => {
      window.dispatchEvent(new Event("online"))
    })

    expect(screen.getByText("Syncing data...")).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(screen.getByText("Back online")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(window.location.origin, expect.any(Object))
    expect(syncPendingActions).toHaveBeenCalledTimes(1)
  })
})
