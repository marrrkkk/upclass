import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"

import { GreetingCard } from "@/components/home/greeting-card"

describe("GreetingCard", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders a morning greeting and role-specific message for teachers", () => {
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(8)

    render(
      <GreetingCard
        userName="Ada Lovelace"
        role="teacher"
        primaryAction={{
          label: "Review submissions",
          href: "/my-org/dashboard#review-queue",
        }}
      />,
    )

    expect(screen.getByRole("heading", { name: "Good morning, Ada" })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="greeting"]')).toBeInTheDocument()
    expect(screen.getByText("Teaching")).toBeInTheDocument()
    expect(
      screen.getByText("Your teaching workspace is ready. Review work that needs feedback and keep your classes moving."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Review submissions" })).toHaveAttribute(
      "href",
      "/my-org/dashboard#review-queue",
    )
  })

  it("falls back to a generic greeting for unnamed students at night with primary action", () => {
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(22)

    render(
      <GreetingCard
        userName=""
        role={null}
        primaryAction={{
          label: "View due work",
          href: "/my-org/classes",
        }}
      />,
    )

    expect(screen.getByRole("heading", { name: "Good night, there" })).toBeInTheDocument()
    expect(
      screen.getByText("Your learning workspace is ready. Continue your work and stay ahead of what is due next."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View due work" })).toHaveAttribute(
      "href",
      "/my-org/classes",
    )
  })
})
