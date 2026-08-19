import { fireEvent, render, screen } from "@testing-library/react"

import { OrgOnboardingSkeleton } from "@/components/onboard/org-onboarding-skeleton"
import { OrgSelectionClient } from "@/components/onboard/org-selection-client"
import { OrgWorkspaceList } from "@/components/onboard/org-workspace-list"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe("workspace launcher", () => {
  it("renders a scannable workspace directory with a separate action rail", () => {
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
            role: "owner",
            memberCount: 12,
          },
        ]}
        onCreate={onCreate}
        onJoin={onJoin}
      />,
    )

    // Personalised directory heading and a distinct action rail.
    expect(screen.getByRole("heading", { name: /Welcome back, Ada/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Your workspaces" })).toBeInTheDocument()
    expect(screen.getByRole("complementary")).toHaveAccessibleName("Where are you headed?")

    // A directory row links straight into the workspace dashboard.
    expect(screen.getByRole("link", { name: /North Academy/ })).toHaveAttribute(
      "href",
      "/north-academy/dashboard",
    )

    // The card now surfaces the description and member count.
    expect(screen.getByText("A busy secondary school workspace")).toBeInTheDocument()
    expect(screen.getByText(/12 members/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Create organization/ }))
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

    expect(screen.getByRole("heading", { name: "Choose a workspace" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Create organization/ }))
    expect(pushMock).toHaveBeenCalledWith("/org/create")

    fireEvent.click(screen.getByRole("button", { name: /Join with a code/ }))
    expect(pushMock).toHaveBeenCalledWith("/org/join")
  })

  it("streams a launcher-shaped fallback on a wide content column", () => {
    render(<OrgOnboardingSkeleton />)

    const main = screen.getByRole("main")
    const contentColumn = main.querySelector(".max-w-\\[72rem\\]")
    expect(contentColumn).not.toBeNull()
    expect(main.querySelector(".max-w-\\[34rem\\]")).toBeNull()
  })
})
