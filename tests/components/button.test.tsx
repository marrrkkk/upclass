import Link from "next/link"
import { render, screen } from "@testing-library/react"

import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("exposes stable variant and size metadata", () => {
    render(<Button variant="soft" size="sm">Review work</Button>)

    const button = screen.getByRole("button", { name: "Review work" })
    expect(button).toHaveAttribute("data-slot", "button")
    expect(button).toHaveAttribute("data-variant", "soft")
    expect(button).toHaveAttribute("data-size", "sm")
    expect(button).toHaveClass("bg-primary-surface", "text-primary-text")
  })

  it("keeps its label width while showing a loading state", () => {
    render(<Button isLoading>Save changes</Button>)

    const button = screen.getByRole("button", { name: "Save changes" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(button).toHaveAttribute("data-loading", "true")
    expect(button.querySelector('[data-slot="button-label"]')).toHaveClass("invisible")
  })

  it("composes onto links without changing their semantics", () => {
    render(
      <Button asChild variant="inverse">
        <Link href="/classes">Open classes</Link>
      </Button>,
    )

    const link = screen.getByRole("link", { name: "Open classes" })
    expect(link).toHaveAttribute("href", "/classes")
    expect(link).toHaveAttribute("data-variant", "inverse")
    expect(link).toHaveClass("bg-foreground", "text-background")
  })

  it("renders left and right icons correctly", () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">←</span>}
        rightIcon={<span data-testid="right-icon">→</span>}
        fullWidth
      >
        Navigate
      </Button>
    )

    const button = screen.getByRole("button", { name: /Navigate/ })
    expect(button).toHaveClass("w-full")
    expect(screen.getByTestId("left-icon")).toBeInTheDocument()
    expect(screen.getByTestId("right-icon")).toBeInTheDocument()
  })
})

