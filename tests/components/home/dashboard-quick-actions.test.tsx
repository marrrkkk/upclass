import { render, screen } from "@testing-library/react"

import { DashboardQuickActions } from "@/components/home/dashboard-quick-actions"

vi.mock("@/hooks/use-organization-path", () => ({
  useOrganizationPath: () => (path: string) => `/academy${path}`,
}))

describe("DashboardQuickActions", () => {
  it("shows teacher actions for teachers", () => {
    render(<DashboardQuickActions role="teacher" />)

    expect(screen.getByRole("heading", { name: "Quick actions" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Create assignment/i })).toHaveAttribute("href", "/academy/classes")
    expect(screen.getByRole("link", { name: /Post announcement/i })).toHaveAttribute("href", "/academy/classes")
    expect(screen.getByRole("link", { name: /Grade submissions/i })).toHaveAttribute("href", "/academy/dashboard#review-queue")
    expect(screen.getByRole("link", { name: /View calendar/i })).toHaveAttribute("href", "/academy/calendar")
    expect(screen.getAllByRole("link")).toHaveLength(4)
    expect(screen.getByText("Work that is ready for feedback")).toBeInTheDocument()
  })

  it("shows student actions for students", () => {
    render(<DashboardQuickActions role="student" />)

    expect(screen.getByRole("link", { name: /View calendar/i })).toHaveAttribute("href", "/academy/calendar")
    expect(screen.getByRole("link", { name: /Submit work/i })).toHaveAttribute("href", "/academy/classes")
    expect(screen.getByRole("link", { name: /Message teacher/i })).toHaveAttribute("href", "/academy/messages")
    expect(screen.getByRole("link", { name: /Browse resources/i })).toHaveAttribute("href", "/academy/resources")
    expect(screen.getAllByRole("link")).toHaveLength(4)
  })

  it("defaults to student actions without a role", () => {
    render(<DashboardQuickActions role={null} />)
    expect(screen.getByRole("link", { name: /Browse resources/i })).toHaveAttribute("href", "/academy/resources")
  })
})