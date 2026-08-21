import { render } from "@testing-library/react"
import { fireEvent } from "@testing-library/react"

import { KeyboardShortcuts } from "@/components/layouts/keyboard-shortcuts"

const mocks = vi.hoisted(() => ({
  pathname: "/academy/dashboard",
  push: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => mocks.pathname,
}))

function keyDown(key: string, target: Element | Node | Window | Document = window) {
  fireEvent.keyDown(target, { key })
}

describe("KeyboardShortcuts", () => {
  beforeEach(() => {
    mocks.push.mockClear()
  })

  it("navigates with two-key g shortcuts", () => {
    render(<KeyboardShortcuts />)

    keyDown("g")
    keyDown("d")
    expect(mocks.push).toHaveBeenCalledWith("/academy/dashboard")

    keyDown("g")
    keyDown("c")
    expect(mocks.push).toHaveBeenCalledWith("/academy/classes")

    keyDown("g")
    keyDown("m")
    expect(mocks.push).toHaveBeenCalledWith("/academy/messages")

    keyDown("g")
    keyDown("r")
    expect(mocks.push).toHaveBeenCalledWith("/academy/resources")
  })

  it("navigates with two-key c shortcuts", () => {
    render(<KeyboardShortcuts />)

    keyDown("c")
    keyDown("a")
    expect(mocks.push).toHaveBeenCalledWith("/academy/classes")

    keyDown("c")
    keyDown("m")
    expect(mocks.push).toHaveBeenCalledWith("/academy/messages")
  })

  it("ignores unknown second keys and bare prefixes", () => {
    render(<KeyboardShortcuts />)

    keyDown("g")
    keyDown("z")
    expect(mocks.push).not.toHaveBeenCalled()

    keyDown("g")
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("does not trigger while typing in an input", () => {
    render(<KeyboardShortcuts />)

    const input = document.createElement("input")
    document.body.appendChild(input)
    keyDown("g", input)
    keyDown("c", input)
    expect(mocks.push).not.toHaveBeenCalled()
    input.remove()
  })

  it("opens the command menu from the / shortcut", () => {
    const dispatchSpy = vi.spyOn(document, "dispatchEvent")
    render(<KeyboardShortcuts />)

    keyDown("/")
    const dispatched = dispatchSpy.mock.calls.find(([event]) => (event as KeyboardEvent).key === "k")
    expect(dispatched).toBeDefined()
    dispatchSpy.mockRestore()
  })

  it("ignores keydown events without a string key", () => {
    render(<KeyboardShortcuts />)

    window.dispatchEvent(new Event("keydown"))
    keyDown("g")
    keyDown("d")

    expect(mocks.push).toHaveBeenCalledWith("/academy/dashboard")
  })
})
