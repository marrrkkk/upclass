import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  ActivityPageClient,
  buildActivityHref,
} from "@/components/activity/activity-page-client"

const navigation = vi.hoisted(() => ({
  pathname: "/academy/activity",
  push: vi.fn(),
  search: "filter=classes&cursor=old-cursor&view=compact",
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

describe("ActivityPageClient", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    })
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    })
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => undefined,
    })
  })

  it("changes filters while clearing a stale cursor and preserving unrelated parameters", async () => {
    const user = userEvent.setup()

    render(
      <ActivityPageClient
        activeFilter="classes"
        items={[]}
        nextCursor={null}
      />,
    )

    await user.click(screen.getByRole("combobox", { name: "Filter activity by type" }))
    await user.click(screen.getByRole("option", { name: "Resources" }))

    expect(navigation.push).toHaveBeenCalledWith(
      "/academy/activity?filter=resources&view=compact",
    )
  })

  it("keeps the active filter and unrelated parameters in the next cursor target", () => {
    render(
      <ActivityPageClient
        activeFilter="coursework"
        items={[]}
        nextCursor="next-cursor"
      />,
    )

    expect(screen.getByRole("search", { name: "Activity filters" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /load more/i })).toHaveAttribute(
      "href",
      "/academy/activity?filter=coursework&cursor=next-cursor&view=compact",
    )
  })

  it("removes the filter parameter for the all view", () => {
    expect(
      buildActivityHref(
        "/academy/activity",
        "filter=classes&cursor=old-cursor&view=compact",
        "all",
      ),
    ).toBe("/academy/activity?view=compact")
  })
})
