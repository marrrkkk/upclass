import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { DashboardAdmin } from "@/components/home/dashboard/dashboard-admin"
import type { AdminDashboardViewModel } from "@/components/home/dashboard"

describe("DashboardAdmin", () => {
  const mockViewModel: AdminDashboardViewModel = {
    role: "admin",
    header: {
      title: "Good morning",
      subtitle: "Here is the current state of your organization.",
      dateLabel: "Monday, January 15",
      primaryAction: {
        label: "Open administration",
        href: "/test-org/admin",
      },
    },
    operations: {
      membersCount: 45,
      classesCount: 12,
      pendingInvitationsCount: 3,
    },
    attention: [
      {
        kind: "pending_invitation",
        id: "inv-1",
        email: "teacher@school.edu",
        role: "teacher",
        invitedAt: new Date().toISOString(),
      },
      {
        kind: "recent_class",
        id: "class-1",
        title: "AP Biology",
        color: "emerald",
        createdAt: new Date().toISOString(),
        memberCount: 24,
      },
    ],
    workspace: {
      shortcuts: [
        { label: "Manage people", href: "/test-org/admin/people", icon: "users" },
        { label: "Manage classes", href: "/test-org/admin/classes", icon: "building" },
        { label: "Invitations", href: "/test-org/admin/people?tab=invitations", icon: "mail" },
        { label: "Settings", href: "/test-org/admin/settings", icon: "settings" },
      ],
    },
    activity: {
      items: [],
    },
    orgSlug: "test-org",
  }

  it("renders admin dashboard with greeting header", () => {
    render(<DashboardAdmin viewModel={mockViewModel} userName="John Admin" />)

    expect(screen.getByText("Good morning, John")).toBeInTheDocument()
    expect(screen.getByText("Here is the current state of your organization.")).toBeInTheDocument()
    expect(screen.getByText("Monday, January 15")).toBeInTheDocument()
  })

  it("displays organization operations metrics", () => {
    render(<DashboardAdmin viewModel={mockViewModel} userName="John Admin" />)

    expect(screen.getByText("People")).toBeInTheDocument()
    expect(screen.getByText("45")).toBeInTheDocument()
    expect(screen.getByText("Classes")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("Pending invites")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("renders admin attention queue with pending invitations and recent classes", () => {
    render(<DashboardAdmin viewModel={mockViewModel} userName="John Admin" />)

    expect(screen.getByText("Organization attention")).toBeInTheDocument()
    expect(screen.getByText("Pending invitation")).toBeInTheDocument()
    expect(screen.getByText("teacher@school.edu")).toBeInTheDocument()
    expect(screen.getByText("AP Biology")).toBeInTheDocument()
    expect(screen.getByText("New class · 24 members")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View all \(2\)/i })).toHaveAttribute(
      "href",
      "/test-org/admin/classes"
    )
  })

  it("displays workspace shortcuts", () => {
    render(<DashboardAdmin viewModel={mockViewModel} userName="John Admin" />)

    expect(screen.getByText("Manage people")).toBeInTheDocument()
    expect(screen.getByText("Manage classes")).toBeInTheDocument()
    expect(screen.getByText("Invitations")).toBeInTheDocument()
    expect(screen.getByText("Settings")).toBeInTheDocument()
  })

  it("shows correct primary action when invitations are pending", () => {
    const viewModelWithInvitations = {
      ...mockViewModel,
      header: {
        ...mockViewModel.header,
        primaryAction: {
          label: "Review invitations",
          href: "/test-org/admin/people?tab=invitations",
        },
      },
    }

    render(<DashboardAdmin viewModel={viewModelWithInvitations} userName="John Admin" />)

    expect(screen.getByRole("link", { name: /Review invitations/i })).toHaveAttribute(
      "href",
      "/test-org/admin/people?tab=invitations"
    )
  })

  it("renders empty attention queue when no items", () => {
    const emptyViewModel = {
      ...mockViewModel,
      attention: [],
    }

    render(<DashboardAdmin viewModel={emptyViewModel} userName="John Admin" />)

    // Attention queue section should not render when empty
    expect(screen.queryByText("Organization attention")).not.toBeInTheDocument()
  })
})
