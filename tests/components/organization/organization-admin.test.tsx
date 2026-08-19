import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { OrgClassesTable } from "@/components/organization/org-classes-table"
import { OrgInvitationsTable } from "@/components/organization/org-invitations-table"
import { OrgMembersTable } from "@/components/organization/org-members-table"
import { OrganizationAdminClient } from "@/components/organization/organization-admin-client"
import type { OrganizationInvitation, OrganizationMember } from "@/types/organization"

const actionMocks = vi.hoisted(() => ({
  createInvitation: vi.fn(),
  removeMember: vi.fn(),
  revokeInvitation: vi.fn(),
  updateMemberRole: vi.fn(),
}))

vi.mock("@/app/actions/organization", () => actionMocks)

const members: OrganizationMember[] = [
  {
    id: "owner-1",
    name: "Organization Owner",
    email: "owner@example.com",
    image: null,
    role: "owner",
    joinedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "admin-1",
    name: "Teacher One",
    email: "teacher@example.com",
    image: null,
    role: "admin",
    joinedAt: "2024-01-02T00:00:00.000Z",
  },
  {
    id: "member-1",
    name: "Student One",
    email: "student@example.com",
    image: null,
    role: "member",
    joinedAt: "2024-01-03T00:00:00.000Z",
  },
]

const invitations: OrganizationInvitation[] = [
  {
    id: "invite-member",
    email: "learner@example.com",
    role: "member",
    token: "student-token",
    expiresAt: "2099-01-07T00:00:00.000Z",
    createdAt: "2099-01-01T00:00:00.000Z",
    invitedByName: "Organization Owner",
  },
  {
    id: "invite-admin",
    email: "teacher2@example.com",
    role: "admin",
    token: "teacher-token",
    expiresAt: "2099-01-07T00:00:00.000Z",
    createdAt: "2099-01-01T00:00:00.000Z",
    invitedByName: "Organization Owner",
  },
]

beforeEach(() => {
  actionMocks.createInvitation.mockResolvedValue({
    success: true,
    data: { token: "new-token", expiresAt: new Date("2099-01-07T00:00:00.000Z") },
  })
  actionMocks.removeMember.mockResolvedValue({ success: true })
  actionMocks.revokeInvitation.mockResolvedValue({ success: true })
  actionMocks.updateMemberRole.mockResolvedValue({ success: true })
})

describe("organization admin rows", () => {
  it("exposes role actions only where the acting role is allowed", async () => {
    const actor = userEvent.setup()
    const onChangeRole = vi.fn()
    const onRemove = vi.fn()
    const { unmount } = render(
      <OrgMembersTable
        members={members}
        currentRole="admin"
        currentUserId="admin-1"
        pending={false}
        onChangeRole={onChangeRole}
        onRemove={onRemove}
      />,
    )

    expect(screen.queryByRole("button", { name: "Manage Organization Owner" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Manage Teacher One" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Manage Student One" })).toBeInTheDocument()

    await actor.click(screen.getByRole("button", { name: "Manage Student One" }))
    expect(await screen.findByRole("menuitem", { name: "Remove from organization" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: /change to teacher/i })).not.toBeInTheDocument()
    await actor.keyboard("{Escape}")
    unmount()

    render(
      <OrgMembersTable
        members={members}
        currentRole="owner"
        currentUserId="owner-1"
        pending={false}
        onChangeRole={onChangeRole}
        onRemove={onRemove}
      />,
    )

    await actor.click(screen.getByRole("button", { name: "Manage Teacher One" }))
    const roleAction = await screen.findByRole("menuitem", { name: "Change to Student" })
    await actor.click(roleAction)
    expect(onChangeRole).toHaveBeenCalledWith(members[1], "member")
  })

  it("renders invitation lifecycle rows, copy controls, and admin-safe revoke actions", async () => {
    const actor = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    render(
      <OrgInvitationsTable
        invitations={invitations}
        currentRole="admin"
        pending={false}
        inviteOrigin="https://upclass.example"
        onRevoke={vi.fn()}
      />,
    )

    const memberRow = screen.getByText("learner@example.com").closest("tr")
    const adminRow = screen.getByText("teacher2@example.com").closest("tr")
    expect(memberRow).not.toBeNull()
    expect(adminRow).not.toBeNull()

    expect(within(memberRow!).getByText("Student")).toBeInTheDocument()
    expect(within(adminRow!).getByText("Teacher")).toBeInTheDocument()
    expect(
      within(memberRow!).getByRole("button", { name: "Revoke invitation for learner@example.com" }),
    ).toBeInTheDocument()
    expect(
      within(adminRow!).queryByRole("button", { name: "Revoke invitation for teacher2@example.com" }),
    ).not.toBeInTheDocument()

    await actor.click(
      within(memberRow!).getByRole("button", {
        name: "Copy invite link for learner@example.com",
      }),
    )
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "https://upclass.example/org/join?token=student-token",
      ),
    )
  })

  it("renders stored class colors through safe semantic swatches", () => {
    const { container } = render(
      <OrgClassesTable
        orgSlug="acme"
        classes={[
          {
            id: "class-1",
            title: "Calculus",
            code: "CALC-1",
            color: "url(javascript:alert(1))",
            ownerName: "Teacher One",
          },
        ]}
      />,
    )

    expect(container.querySelector("[style]")).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Calculus course" })).toHaveAttribute(
      "data-tone",
      expect.stringMatching(/^course-[1-6]$/),
    )
    expect(screen.getByRole("link", { name: "Open Calculus" })).toHaveAttribute(
      "href",
      "/acme/classes/class-1",
    )
  })
})


describe("OrganizationAdminClient", () => {
  const organization = {
    id: "org-1",
    name: "Acme Academy",
    slug: "acme",
    description: null,
    logo: null,
  }

  it("creates an invitation, copies its link, and preserves the selected role", async () => {
    const actor = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    render(
      <OrganizationAdminClient
        organization={organization}
        currentRole="owner"
        currentUserId="owner-1"
        members={members}
        classes={[]}
        invitations={[]}
        inviteOrigin="https://upclass.example"
      />,
    )

    await actor.type(screen.getByLabelText("Email address"), "newstudent@example.com")
    await actor.click(screen.getByRole("button", { name: "Send invite" }))

    await waitFor(() =>
      expect(actionMocks.createInvitation).toHaveBeenCalledWith({
        orgId: "org-1",
        email: "newstudent@example.com",
        role: "member",
      }),
    )
    expect(writeText).toHaveBeenCalledWith(
      "https://upclass.example/org/join?token=new-token",
    )
    expect(screen.getByText(/invite created for newstudent@example.com/i)).toBeInTheDocument()
  })

  it("wires invitation revocation through the confirmation dialog", async () => {
    const actor = userEvent.setup()
    render(
      <OrganizationAdminClient
        organization={organization}
        currentRole="owner"
        currentUserId="owner-1"
        members={members}
        classes={[]}
        invitations={[invitations[0]]}
        inviteOrigin="https://upclass.example"
      />,
    )

    await actor.click(screen.getByRole("tab", { name: /invitations/i }))
    await actor.click(
      screen.getByRole("button", { name: "Revoke invitation for learner@example.com" }),
    )
    expect(screen.getByRole("heading", { name: "Revoke this invitation?" })).toBeInTheDocument()
    await actor.click(screen.getByRole("button", { name: "Revoke invite" }))

    await waitFor(() =>
      expect(actionMocks.revokeInvitation).toHaveBeenCalledWith({
        orgId: "org-1",
        invitationId: "invite-member",
      }),
    )
    expect(screen.getByText("The invitation for learner@example.com was revoked.")).toBeInTheDocument()
  })
})
