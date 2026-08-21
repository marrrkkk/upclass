import { render, screen } from "@testing-library/react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
} from "@/components/ui/card"

describe("Card", () => {
  it("renders the default semantic surface and structured content slots", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Weekly overview</CardTitle>
          <CardDescription>Course progress and upcoming work.</CardDescription>
          <CardAction><button type="button">Open menu</button></CardAction>
        </CardHeader>
        <CardContent>Three assignments due</CardContent>
        <CardFooter>Updated today</CardFooter>
      </Card>,
    )

    const card = screen.getByText("Weekly overview").closest('[data-slot="card"]')
    expect(card).toHaveAttribute("data-variant", "flat")
    expect(card).toHaveClass("rounded-[var(--radius-cards)]", "border-hairline", "bg-card")
    expect(card).not.toHaveClass("shadow-e1")
    expect(card).not.toHaveClass("shadow-e2")
    expect(card?.querySelector('[data-slot="card-action"]')).toBeInTheDocument()
    expect(card?.querySelector('[data-slot="card-footer"]')).toHaveClass("bg-surface-sunken/70")
  })

  it("provides distinct interactive, inset, and workspace surfaces", () => {
    expect(cardVariants({ variant: "interactive" })).toContain("hover:bg-surface-raised")
    expect(cardVariants({ variant: "interactive" })).not.toContain("hover:shadow-e2")
    expect(cardVariants({ variant: "dark" })).toContain("bg-foreground")
    expect(cardVariants({ variant: "accent" })).toContain("border-transparent")
    expect(cardVariants({ variant: "inset" })).toContain("bg-surface-sunken")
    expect(cardVariants({ variant: "workspace" })).toContain("before:bg-primary-strong")
  })
})
