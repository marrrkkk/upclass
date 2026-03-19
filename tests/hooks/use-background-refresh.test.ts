import { act, renderHook } from "@testing-library/react"
import { useRouter } from "next/navigation"

import { useBackgroundRefresh } from "@/hooks/use-background-refresh"

describe("useBackgroundRefresh", () => {
  const mockedRouter = useRouter()

  beforeEach(() => {
    vi.useFakeTimers()
    setNavigatorOnline(true)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    delete (window as Window & { __UPCLASS_SERVER_ONLINE__?: boolean }).__UPCLASS_SERVER_ONLINE__
  })

  it("refreshes on the configured interval when online", () => {
    const { unmount } = renderHook(() => useBackgroundRefresh("/classes", 1000))

    act(() => {
      vi.advanceTimersByTime(999)
    })

    expect(mockedRouter.refresh).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(mockedRouter.refresh).toHaveBeenCalledTimes(1)

    unmount()
  })

  it("skips refresh while browser or server connectivity is offline", () => {
    setNavigatorOnline(false)
    ;(window as Window & { __UPCLASS_SERVER_ONLINE__?: boolean }).__UPCLASS_SERVER_ONLINE__ = false

    renderHook(() => useBackgroundRefresh("/resources", 500))

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockedRouter.refresh).not.toHaveBeenCalled()
  })

  it("returns a manual refresh helper", () => {
    const { result } = renderHook(() => useBackgroundRefresh("/home", 5000))

    act(() => {
      result.current.refresh()
    })

    expect(mockedRouter.refresh).toHaveBeenCalledTimes(1)
  })

  it("does not schedule an interval when disabled", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval")

    renderHook(() => useBackgroundRefresh("/home", 0))

    expect(setIntervalSpy).not.toHaveBeenCalled()
  })
})

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  })
}
