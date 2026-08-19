import { render, screen } from "@testing-library/react"

import { ClassesPageShell } from "@/components/classes/classes-page-shell"
import { MessagesHeader } from "@/components/messages/messages-header"
import { NotificationsHeader } from "@/components/notifications/notifications-header"
import { AdminPageShell } from "@/components/organization/admin-page-shell"
import { ProfilePageShell } from "@/components/profile/profile-page-shell"
import { ResourcesPageShell } from "@/components/resources/resources-page-shell"
import { SettingsHeader } from "@/components/settings/settings-header"

describe("route static shells", () => {
  it("renders the Classes shell title and description with a slot for the data region", () => {
    render(
      <ClassesPageShell>
        <div>grid region</div>
      </ClassesPageShell>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Classes" })).toBeInTheDocument()
    expect(
      screen.getByText("Find and open every class in this organization."),
    ).toBeInTheDocument()
    expect(screen.getByText("grid region")).toBeInTheDocument()
  })

  it("renders the Messages header without any data", () => {
    render(<MessagesHeader />)

    expect(screen.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    expect(screen.getByText("Connect with your classmates and teachers.")).toBeInTheDocument()
  })

  it("renders the Notifications header without any data", () => {
    render(<NotificationsHeader />)

    expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toBeInTheDocument()
    expect(
      screen.getByText("Announcements and coursework updates from your classes."),
    ).toBeInTheDocument()
  })

  it("renders the Settings header without any data", () => {
    render(<SettingsHeader />)

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument()
    expect(
      screen.getByText("Manage your profile, privacy, notifications, and device preferences."),
    ).toBeInTheDocument()
  })

  it("renders the Resources shell toolbar frame with a slot for the grid", () => {
    render(
      <ResourcesPageShell filters={<div>filters</div>} summary="2 resources">
        <div>grid region</div>
      </ResourcesPageShell>,
    )

    expect(screen.getByRole("search", { name: "Resource filters" })).toBeInTheDocument()
    expect(screen.getByText("filters")).toBeInTheDocument()
    expect(screen.getByText("2 resources")).toBeInTheDocument()
    expect(screen.getByText("grid region")).toBeInTheDocument()
  })

  it("renders the Admin shell with the static Organization label and a data slot", () => {
    render(
      <AdminPageShell>
        <div>data region</div>
      </AdminPageShell>,
    )

    expect(screen.getByText("Organization")).toBeInTheDocument()
    expect(screen.getByText("data region")).toBeInTheDocument()
  })

  it("renders the Profile shell scaffold with the static Profile label and a data slot", () => {
    render(
      <ProfilePageShell>
        <div>data region</div>
      </ProfilePageShell>,
    )

    expect(screen.getByText("Profile")).toBeInTheDocument()
    expect(screen.getByText("data region")).toBeInTheDocument()
  })
})