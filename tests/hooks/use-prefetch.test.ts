import { act, renderHook } from "@testing-library/react"
import { useRouter } from "next/navigation"

import { usePrefetch } from "@/hooks/use-prefetch"

describe("usePrefetch", () => {
  const mockedRouter = useRouter()

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("prefetches a route once and ignores repeated calls", () => {
    const { result } = renderHook(() => usePrefetch())

    act(() => {
      result.current.prefetch("/classes")
      result.current.prefetch("/classes")
    })

    expect(mockedRouter.prefetch).toHaveBeenCalledTimes(1)
    expect(mockedRouter.prefetch).toHaveBeenCalledWith("/classes")
  })

  it("prefetches after the hover delay and cancels pending prefetches", () => {
    const { result } = renderHook(() => usePrefetch())

    act(() => {
      result.current.prefetchOnHover("/resources", 200)
    })

    act(() => {
      vi.advanceTimersByTime(199)
    })

    expect(mockedRouter.prefetch).not.toHaveBeenCalled()

    act(() => {
      result.current.cancelPrefetch("/resources")
      vi.advanceTimersByTime(10)
    })

    expect(mockedRouter.prefetch).not.toHaveBeenCalled()
  })

  it("cleans up pending hover timeouts on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")
    const { result, unmount } = renderHook(() => usePrefetch())

    act(() => {
      result.current.prefetchOnHover("/messages", 500)
    })

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockedRouter.prefetch).not.toHaveBeenCalled()
  })
})
