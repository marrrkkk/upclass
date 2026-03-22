import { render, screen } from "@testing-library/react"

import { OfflineIndicator } from "@/components/offline-indicator"
import { usePWAState } from "@/lib/pwa-state"

describe("OfflineIndicator", () => {
  beforeEach(() => {
    usePWAState.setState({
      pathname: "/classes/class-123",
      online: true,
      syncing: false,
      cacheReady: true,
      updateAvailable: false,
      installPromptReady: false,
      installPlatform: null,
      installDismissed: false,
      offlineBannerDismissed: false,
      standalone: false,
      warmedRoutes: ["/classes"],
      lastConnectionChangeAt: null,
      lastSyncAt: null,
      pendingActions: 0,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("shows the offline message and exposes a dismiss button", () => {
    usePWAState.setState({
      online: false,
      pendingActions: 2,
    })

    render(<OfflineIndicator />)

    expect(
      screen.getByText(/classes is available from cache\. changes will sync when you reconnect\./i),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /dismiss offline status/i })).toBeInTheDocument()
  })

  it("shows syncing state when queued changes are being replayed", () => {
    usePWAState.setState({
      online: true,
      syncing: true,
      pendingActions: 3,
      lastConnectionChangeAt: Date.now(),
    })

    render(<OfflineIndicator />)

    expect(screen.getByText("Syncing changes")).toBeInTheDocument()
    expect(screen.getByText(/syncing 3 queued changes\./i)).toBeInTheDocument()
  })
})
