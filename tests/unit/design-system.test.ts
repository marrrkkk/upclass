import { buttonVariants } from "@/components/ui/button"
import { DENSITIES, control, panelVariants, spacing } from "@/lib/design-system"

describe("design-system geometry contracts", () => {
  it("publishes the supported density modes in stable order", () => {
    expect(DENSITIES).toEqual(["compact", "default", "comfortable"])
  })

  it("maps shared control geometry to CSS variables", () => {
    expect(control).toEqual({
      height: {
        sm: "h-[var(--control-height-sm)]",
        md: "h-[var(--control-height-md)]",
        lg: "h-[var(--control-height-lg)]",
      },
      radius: "rounded-[var(--radius-control)]",
    })
    expect(spacing[1]).toBe("var(--space-1)")
    expect(spacing[10]).toBe("var(--space-10)")
  })

  it("keeps button sizes density-aware without changing the public size API", () => {
    expect(buttonVariants({ size: "xs" })).toContain("h-6")
    expect(buttonVariants({ size: "sm" })).toContain("h-[var(--control-height-sm)]")
    expect(buttonVariants({ size: "default" })).toContain("h-[var(--control-height-md)]")
    expect(buttonVariants({ size: "lg" })).toContain("h-[var(--control-height-lg)]")
    expect(buttonVariants({ size: "icon-xs" })).toContain("size-6")
    expect(buttonVariants({ size: "icon" })).toContain("size-[var(--control-height-md)]")
  })

  it("uses a solid azure primary action and a tinted secondary/outline action", () => {
    const primary = buttonVariants({ variant: "default" }).split(" ")
    const outline = buttonVariants({ variant: "outline" }).split(" ")
    const secondary = buttonVariants({ variant: "secondary" }).split(" ")

    expect(primary).toContain("bg-primary")
    expect(primary).toContain("text-primary-foreground")
    expect(outline).toContain("bg-card")
    expect(outline).toContain("text-foreground")
    expect(secondary).toContain("bg-surface-subtle")
    expect(secondary).toContain("text-foreground")
  })

  it("provides a dedicated floating sheet surface", () => {
    const classes = panelVariants({ variant: "floating", padding: "none" })
    expect(classes).toContain("rounded-[var(--radius-floating)]")
    expect(classes).toContain("bg-popover")
    expect(classes).toContain("shadow-e2")
  })
})
