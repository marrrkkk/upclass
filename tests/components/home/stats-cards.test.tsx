import { render, screen, within } from "@testing-library/react"

import { StatsCards } from "@/components/home/stats-cards"

const stats = {
  totalClasses: 4,
  pendingTasks: 3,
  unreadMessages: 2,
  unreadNotifications: 1,
  pendingSubmissions: 7,
  overdueWork: 5,
  unreadStudentQuestions: 6,
  lowParticipationAlerts: 2,
}

describe("StatsCards", () => {
  it("keeps the teacher summary focused on four current metrics", () => {
    render(<StatsCards stats={stats} role="teacher" />)

    const summary = screen.getByLabelText("Dashboard summary")
    expect(summary).toHaveAttribute("data-slot", "stat-group")
    expect(summary.querySelectorAll('[data-slot="stat-tile"]')).toHaveLength(4)
    expect(within(summary).getByText("Pending reviews")).toBeInTheDocument()
    expect(within(summary).queryByText("Overdue work")).not.toBeInTheDocument()
    expect(within(summary).queryByText("Low participation")).not.toBeInTheDocument()
  })

  it("keeps the student summary focused on four current metrics", () => {
    render(<StatsCards stats={stats} role="student" />)

    const summary = screen.getByLabelText("Dashboard summary")
    expect(summary.querySelectorAll('[data-slot="stat-tile"]')).toHaveLength(4)
    expect(within(summary).getByText("Pending tasks")).toBeInTheDocument()
    expect(within(summary).queryByText("Pending reviews")).not.toBeInTheDocument()
  })
})
