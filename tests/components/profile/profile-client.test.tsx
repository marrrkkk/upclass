import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ProfileClient } from "@/components/profile/profile-client"
import { ProfileCover } from "@/components/profile/profile-cover"

const { setPageTitle } = vi.hoisted(() => ({ setPageTitle: vi.fn() }))

vi.mock("@/components/profile/edit-profile-dialog", () => ({
  EditProfileDialog: () => <button type="button">Edit profile</button>,
}))

vi.mock("@/hooks/use-organization-path", () => ({
  useOrganizationPath: () => (path: string) => `/acme${path}`,
}))

vi.mock("@/stores/page-header-store", () => ({
  usePageHeaderStore: (selector: (state: { setPageTitle: typeof setPageTitle }) => unknown) =>
    selector({ setPageTitle }),
}))

const profile = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  image: null,
  cover: null,
  coverColor: "#0e6b52",
  bio: "Mathematics and computing.",
  role: "teacher" as const,
}

const createdClasses = [
  {
    id: "class-1",
    title: "Analytical Engines",
    description: "A seminar on programmable machines.",
    category: "Computing",
    color: "not-a-css-color",
    createdAt: "2025-01-02T00:00:00.000Z",
    enrolledCount: 12,
    teacherName: "Ada Lovelace",
    teacherImage: null,
  },
]

const resources = [
  {
    id: "resource-1",
    title: "Engine notes",
    description: "Lecture notes",
    category: "Notes",
    fileType: "pdf",
    fileUrl: "https://files.example/engine.pdf",
    fileName: "engine.pdf",
    fileSize: "2048",
    createdAt: "2025-01-03T00:00:00.000Z",
    authorName: "Ada Lovelace",
    authorImage: null,
  },
]

describe("ProfileClient", () => {
  it("shows only the private identity state when a profile is restricted", () => {
    render(
      <ProfileClient
        user={profile}
        createdClasses={createdClasses}
        enrolledClasses={[]}
        createdResources={resources}
        isPrivate
      />,
    )

    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument()
    expect(screen.getByText("Private profile")).toBeInTheDocument()
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument()
    expect(screen.queryByText("Analytical Engines")).not.toBeInTheDocument()
    expect(screen.queryByText("Engine notes")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /message/i })).not.toBeInTheDocument()
  })

  it("shows public profile data and keeps collection links inside the tenant", async () => {
    const actor = userEvent.setup()
    render(
      <ProfileClient
        user={profile}
        createdClasses={createdClasses}
        enrolledClasses={[]}
        createdResources={resources}
      />,
    )

    expect(screen.getByText("ada@example.com")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Message" })).toHaveAttribute(
      "href",
      "/acme/messages/user-1",
    )
    expect(screen.getByRole("link", { name: "Open Analytical Engines" })).toHaveAttribute(
      "href",
      "/acme/classes/class-1",
    )

    await actor.click(screen.getByRole("tab", { name: /resources/i }))
    expect(screen.getByRole("link", { name: "Open Engine notes" })).toHaveAttribute(
      "href",
      "/acme/resources/resource-1",
    )
    expect(screen.getByRole("link", { name: "Download Engine notes" })).toHaveAttribute(
      "href",
      "https://files.example/engine.pdf",
    )
  })

  it("shows profile editing only to the owner", () => {
    render(
      <ProfileClient
        user={profile}
        createdClasses={[]}
        enrolledClasses={[]}
        createdResources={[]}
        isOwnProfile
      />,
    )

    expect(screen.getByRole("button", { name: "Edit profile" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Message" })).not.toBeInTheDocument()
  })
})

describe("ProfileCover", () => {
  it("maps persisted cover values to finite semantic classes without inline styles", () => {
    const { container, rerender } = render(
      <ProfileCover color={'url("https://unsafe.example")'} image={null} name="Ada Lovelace" />,
    )

    const cover = container.querySelector('[data-slot="profile-cover"]')
    expect(cover).toHaveAttribute("data-cover-tone", "neutral")
    expect(cover).not.toHaveAttribute("style")

    rerender(<ProfileCover color="#0e6b52" image={null} name="Ada Lovelace" />)
    expect(cover).toHaveAttribute("data-cover-tone", "primary")
    expect(cover).not.toHaveAttribute("style")
  })
})
