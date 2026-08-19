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
    expect(slug).toHaveAccessibleDescription("Use at least 3 characters.")
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
