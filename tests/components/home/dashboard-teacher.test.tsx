import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { DashboardTeacher } from "@/components/home/dashboard/dashboard-teacher"
import type { TeacherDashboardViewModel } from "@/components/home/dashboard"

describe("DashboardTeacher", () => {
  const mockViewModel: TeacherDashboardViewModel = {
    role: "teacher",
    header: {
      title: "Good morning",
      subtitle: "Here is what needs your attention across your classes today.",
      dateLabel: "Monday, January 15",
      primaryAction: {
        label: "Review submissions",
        href: "/test-org/classes",
      },
    },
    queue: [
      {
        kind: "submission",
        id: "sub-1",
        submissionId: "sub-123",
        classworkId: "cw-1",
        classworkTitle: "Chapter 5 Essay",
        studentName: "Alice Johnson",
        classId: "class-eng",
        className: "AP English",
        classColor: "amber",
        submittedAt: new Date().toISOString(),
        attachmentCount: 2,
      },
      {
        kind: "question",
        id: "q-1",
        count: 3,
        title: "Student inquiries",
      },
      {
        kind: "overdue_alert",
        id: "overdue-1",
        count: 5,
        title: "Overdue submissions",
      },
    ],
    metrics: [
      { label: "To review", value: 8, visible: true },
      { label: "Unread questions", value: 3, visible: true },
      { label: "Overdue work", value: 5, visible: true },
      { label: "Graded this week", value: 12, visible: true },
    ],
    deadlines: [
      {
        id: "dl-1",
        title: "Physics Lab Report",
        type: "assignment",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        classId: "class-phys",
        className: "Physics 101",
        classColor: "blue",
        points: "100",
        submissionCount: 18,
        totalStudents: 25,
      },
    ],
    checkIns: [
      {
        userId: "user-1",
        studentName: "Bob Smith",
        classId: "class-math",
        className: "Algebra II",
        lastActiveAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    classes: [
      {
        id: "class-1",
        title: "AP English",
        description: "Advanced Placement English Literature",
        color: "amber",
        category: "English",
        memberCount: 28,
        role: "teacher",
      },
    ],
    activity: {
      items: [],
    },
    pulse: null,
    orgSlug: "test-org",
  }

  it("renders teacher dashboard with greeting and subtitle", () => {
    render(<DashboardTeacher viewModel={mockViewModel} userName="Jane Teacher" />)

    expect(screen.getByText("Good morning, Jane")).toBeInTheDocument()
    expect(
      screen.getByText("Here is what needs your attention across your classes today.")
    ).toBeInTheDocument()
  })

  it("displays teacher pulse metrics", () => {
    render(<DashboardTeacher viewModel={mockViewModel} userName="Jane Teacher" />)

    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.getByText("To review")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Unread questions")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("Overdue work")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("Graded this week")).toBeInTheDocument()
  })

  it("renders teaching queue with submissions, questions, and overdue alerts", () => {
    render(<DashboardTeacher viewModel={mockViewModel} userName="Jane Teacher" />)

    expect(screen.getByText("Teaching queue")).toBeInTheDocument()
    expect(screen.getByText("Chapter 5 Essay")).toBeInTheDocument()
    expect(screen.getByText("Alice Johnson · AP English")).toBeInTheDocument()
    expect(screen.getByText("3 unread student questions")).toBeInTheDocument()
    expect(screen.getByText("5 overdue submissions")).toBeInTheDocument()
  })

  it("displays upcoming classwork deadlines", () => {
    render(<DashboardTeacher viewModel={mockViewModel} userName="Jane Teacher" />)

    expect(screen.getByText("Upcoming classwork")).toBeInTheDocument()
    expect(screen.getByText("Physics Lab Report")).toBeInTheDocument()
    expect(screen.getByText(/Physics 101 · Assignment · 18\/25 submitted/)).toBeInTheDocument()
  })

  it("shows student check-in section when students need attention", () => {
    render(<DashboardTeacher viewModel={mockViewModel} userName="Jane Teacher" />)

    expect(screen.getByText("Students to check in with")).toBeInTheDocument()
    expect(screen.getByText("No class activity in the last seven days.")).toBeInTheDocument()
    expect(screen.getByText("Bob Smith")).toBeInTheDocument()
    expect(screen.getByText("Algebra II")).toBeInTheDocument()
  })

  it("does not show check-in section when no students need attention", () => {
    const viewModelNoCheckIns = {
      ...mockViewModel,
      checkIns: [],
    }

    render(<DashboardTeacher viewModel={viewModelNoCheckIns} userName="Jane Teacher" />)

    expect(screen.queryByText("Students to check in with")).not.toBeInTheDocument()
  })

  it("displays classes section", () => {
    render(<DashboardTeacher viewModel={mockViewModel} userName="Jane Teacher" />)

    expect(screen.getByText("Your classes")).toBeInTheDocument()
    expect(screen.getByText("AP English")).toBeInTheDocument()
    expect(screen.getByText(/English · 28 students/)).toBeInTheDocument()
  })

  it("hides metrics with zero values", () => {
    const viewModelWithZeroMetrics = {
      ...mockViewModel,
      metrics: [
        { label: "To review", value: 5, visible: true },
        { label: "Unread questions", value: 0, visible: false },
        { label: "Overdue work", value: 0, visible: false },
        { label: "Graded this week", value: 0, visible: false },
      ],
    }

    render(<DashboardTeacher viewModel={viewModelWithZeroMetrics} userName="Jane Teacher" />)

    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("To review")).toBeInTheDocument()
    expect(screen.queryByText("Unread questions")).not.toBeInTheDocument()
    expect(screen.queryByText("Overdue work")).not.toBeInTheDocument()
  })

  it("changes primary action based on queue content", () => {
    render(<DashboardTeacher viewModel={mockViewModel} userName="Jane Teacher" />)

    const primaryAction = screen.getByRole("link", { name: /Review submissions/i })
    expect(primaryAction).toHaveAttribute("href", "/test-org/classes")
  })
})
