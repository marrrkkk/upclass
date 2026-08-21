import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import React from "react"
import { afterEach, vi } from "vitest"

const router = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  forward: vi.fn(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    children: React.ReactNode
    prefetch?: boolean | null
  }) => {
    void prefetch
    return React.createElement("a", { href, ...props }, children)
  },
}))

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  Object.defineProperty(window, "PointerEvent", {
    writable: true,
    value: MouseEvent,
  })

  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    writable: true,
    value: vi.fn(),
  })

  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  })
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.clear()
  }
  if (typeof localStorage !== "undefined") {
    localStorage.clear()
  }
})
