import { fireEvent, render, screen } from "@testing-library/react"

import { OrgCreateForm } from "@/components/onboard/org-create-form"
import { OrgJoinForm } from "@/components/onboard/org-join-form"

describe("organization onboarding forms", () => {
  it("associates required organization fields with their active guidance", () => {
    render(
      <OrgCreateForm
        pending={false}
        error={null}
        onBack={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const name = screen.getByLabelText("Organization name")
    const slug = screen.getByLabelText("Workspace URL")

    expect(name).toBeRequired()
    expect(name).toHaveAccessibleDescription("Everyone you invite will see this name.")
    expect(slug).toBeRequired()

    fireEvent.change(slug, { target: { value: "ab" } })

    expect(slug).toHaveAttribute("aria-invalid", "true")
    expect(slug).toHaveAttribute("aria-describedby", "org-slug-error")
    expect(slug).toHaveAccessibleDescription("Organization URL must be at least 3 characters")

    // Reserved slugs are caught inline, mirroring the server rules, instead of
    // failing only after submit with a contextless error.
    fireEvent.change(slug, { target: { value: "admin" } })

    expect(slug).toHaveAttribute("aria-invalid", "true")
    expect(slug).toHaveAccessibleDescription("That URL is reserved. Pick a different one")
  })

  it("offers optional logo and cover uploads alongside the identity fields", () => {
    render(
      <OrgCreateForm
        pending={false}
        error={null}
        onBack={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("Organization icon")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /upload cover/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^upload$/i })).toBeInTheDocument()
    expect(screen.getByLabelText("Upload organization logo")).toBeInTheDocument()
    expect(screen.getByLabelText("Upload organization cover")).toBeInTheDocument()
  })

  it("marks the invite code as required and links its help text", () => {
    render(
      <OrgJoinForm
        pending={false}
        error={null}
        onBack={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const code = screen.getByLabelText("Invite code")
    expect(code).toBeRequired()
    expect(code).toHaveAccessibleDescription(
      "Ask your teacher or administrator if you do not have one yet.",
    )
  })
})
