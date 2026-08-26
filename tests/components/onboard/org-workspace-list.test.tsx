import { fireEvent, render, screen } from "@testing-library/react"

import { OrgOnboardingSkeleton } from "@/components/onboard/org-onboarding-skeleton"
import { OrgSelectionClient } from "@/components/onboard/org-selection-client"
import { OrgWorkspaceList } from "@/components/onboard/org-workspace-list"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe("workspace launcher", () => {
  it("renders a welcome hero over a card grid of organizations", () => {
    const onCreate = vi.fn()
    const onJoin = vi.fn()

    render(
      <OrgWorkspaceList
        greetingName="Ada Lovelace"
        organizations={[
          {
            id: "org-1",
            name: "North Academy",
            slug: "north-academy",
            description: "A busy secondary school workspace",
            logo: null,
            cover: "https://storage.example/covers/north-academy.jpg",
            role: "owner",
            memberCount: 12,
          },
        ]}
        onCreate={onCreate}
        onJoin={onJoin}
      />,
    )

    // Personalised hero and directory heading.
    expect(screen.getByRole("heading", { name: /Good to see you, Ada/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Your organizations" })).toBeInTheDocument()

    // A card links straight into the workspace dashboard.
    expect(screen.getByRole("link", { name: /North Academy/ })).toHaveAttribute(
      "href",
      "/north-academy/dashboard",
    )
    expect(screen.getByText(/12 members/)).toBeInTheDocument()

    // A stored cover renders as the card banner.
    const card = screen.getByRole("link", { name: /North Academy/ })
    const banner = Array.from(card.querySelectorAll<HTMLElement>("[style]")).find((element) =>
      element.style.backgroundImage.includes("north-academy.jpg"),
    )
    expect(banner).toBeDefined()

    // Both create entry points (hero button and card) route onward.
    fireEvent.click(screen.getAllByRole("button", { name: /Create organization/ })[0])
    fireEvent.click(screen.getByRole("button", { name: /Join with a code/ }))

    expect(onCreate).toHaveBeenCalledOnce()
    expect(onJoin).toHaveBeenCalledOnce()
  })

  it("routes create and join actions to dedicated onboarding pages", () => {
    pushMock.mockReset()

    render(
      <OrgSelectionClient
        userOrganizations={[]}
        initialData={{ email: "teacher@example.com" }}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Good to see you" }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /Create organization/ })[0])
    expect(pushMock).toHaveBeenCalledWith("/org/create")

    fireEvent.click(screen.getByRole("button", { name: /Join with a code/ }))
    expect(pushMock).toHaveBeenCalledWith("/org/join")
  })

  it("streams a hero-shaped fallback on the wide shell column", () => {
    render(<OrgOnboardingSkeleton />)

    const main = screen.getByRole("main")
    expect(main.querySelectorAll(".max-w-\\[88rem\\]").length).toBeGreaterThanOrEqual(2)
    expect(main.querySelector(".max-w-\\[34rem\\]")).toBeNull()
  })
})
