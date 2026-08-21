import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { DashboardStudent } from "@/components/home/dashboard/dashboard-student"
import type { StudentDashboardViewModel } from "@/components/home/dashboard"

describe("DashboardStudent", () => {
  const mockViewModel: StudentDashboardViewModel = {
    role: "student",
    header: {
      title: "Good morning",
      subtitle: "Here is what needs your attention across your classes today.",
      dateLabel: "Monday, January 15",
      primaryAction: {
        label: "Start assignment",
        href: "/test-org/classes/class-1?tab=classwork",
      },
    },
    nextAction: {
      id: "cw-1",
      title: "Chapter 3 Homework",
      type: "assignment",
      classId: "class-math",
      className: "Algebra II",
      classColor: "blue",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      points: "50",
      status: "not_started",
      actionLabel: "Start assignment",
      actionHref: "/test-org/classes/class-math?tab=classwork",
    },
    attention: [
      {
        kind: "due_soon",
        id: "cw-2",
        title: "Physics Quiz",
        type: "quiz",
        classId: "class-phys",
        className: "Physics 101",
        classColor: "purple",
        dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
        points: "100",
        isSubmitted: false,
      },
      {
        kind: "graded",
        id: "sub-1",
        title: "Essay Draft",
        classId: "class-eng",
        className: "English",
        classColor: "amber",
        gradedAt: new Date().toISOString(),
        grade: "95",
        points: "100",
      },
      {
        kind: "unread_message",
        id: "msg-1",
        senderName: "Ms. Johnson",
        preview: "Great work on your recent submission!",
        createdAt: new Date().toISOString(),
      },
    ],
    timeline: [
      {
        id: "tl-1",
        title: "Math Homework",
        type: "assignment",
        classId: "class-math",
        className: "Algebra II",
        classColor: "blue",
        dueDate: new Date(),
        points: "50",
        isSubmitted: false,
        isGraded: false,
        bucket: "today",
      },
      {
        id: "tl-2",
        title: "Science Project",
        type: "assignment",
        classId: "class-sci",
        className: "Biology",
        classColor: "emerald",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        points: "200",
        isSubmitted: false,
        isGraded: false,
        bucket: "this_week",
      },
    ],
    classes: [
      {
        id: "class-1",
        title: "Algebra II",
        description: "Advanced algebra and functions",
        color: "blue",
        category: "Mathematics",
        memberCount: 30,
        role: "student",
      },
    ],
    feedback: [
      {
        id: "fb-1",
        classworkTitle: "Essay Draft",
        classId: "class-eng",
        className: "English",
        classColor: "amber",
        gradedAt: new Date().toISOString(),
        grade: "95",
        feedback: "Excellent analysis!",
        points: "100",
      },
    ],
    messages: [
      {
        id: "msg-1",
        senderName: "Ms. Johnson",
        preview: "Great work on your recent submission!",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ],
    activity: {
      items: [],
    },
    pulse: null,
    orgSlug: "test-org",
  }

  it("renders student dashboard with greeting and subtitle", () => {
    render(<DashboardStudent viewModel={mockViewModel} userName="Alex Student" />)

    expect(screen.getByText("Good morning, Alex")).toBeInTheDocument()
    expect(
      screen.getByText("Here is what needs your attention across your classes today.")
    ).toBeInTheDocument()
  })

  it("displays next action section with unfinished assignment", () => {
    render(<DashboardStudent viewModel={mockViewModel} userName="Alex Student" />)

    expect(screen.getByText("Next up")).toBeInTheDocument()
    expect(screen.getByText("Chapter 3 Homework")).toBeInTheDocument()
    expect(screen.getByText("Algebra II")).toBeInTheDocument()
    expect(screen.getByText("Not started")).toBeInTheDocument()
    // The header button links to class-1, the next action panel links to class-math
    const allLinks = screen.getAllByRole("link", { name: /Start assignment/i })
    const nextActionLink = allLinks.find(link => link.getAttribute("href")?.includes("class-math"))
    expect(nextActionLink).toBeDefined()
  })

  it("shows 'all caught up' when no next action", () => {
    const viewModelNoAction = {
      ...mockViewModel,
      nextAction: null,
    }

    render(<DashboardStudent viewModel={viewModelNoAction} userName="Alex Student" />)

    expect(screen.getByText("All caught up")).toBeInTheDocument()
    expect(
      screen.getByText("No urgent work right now. Check your classes for upcoming assignments.")
    ).toBeInTheDocument()
  })

  it("displays attention queue with due soon, graded, and messages", () => {
    render(<DashboardStudent viewModel={mockViewModel} userName="Alex Student" />)

    expect(screen.getByText("Attention")).toBeInTheDocument()
    expect(screen.getByText("Physics Quiz")).toBeInTheDocument()
    expect(screen.getByText("Physics 101 · Quiz")).toBeInTheDocument()
    const essayDrafts = screen.getAllByText("Essay Draft")
    expect(essayDrafts.length).toBeGreaterThan(0)
    expect(screen.getByText("English · Graded")).toBeInTheDocument()
    expect(screen.getByText("Message from Ms. Johnson")).toBeInTheDocument()
  })

  it("displays learning runway timeline", () => {
    render(<DashboardStudent viewModel={mockViewModel} userName="Alex Student" />)

    expect(screen.getByText("Learning runway")).toBeInTheDocument()
    // Timeline buckets use uppercase labels
    const dueTodayLabels = screen.getAllByText(/due today/i)
    expect(dueTodayLabels.length).toBeGreaterThan(0)
    expect(screen.getByText("Math Homework")).toBeInTheDocument()
    const dueThisWeekLabels = screen.getAllByText(/due this week/i)
    expect(dueThisWeekLabels.length).toBeGreaterThan(0)
    expect(screen.getByText("Science Project")).toBeInTheDocument()
  })

  it("displays feedback and messages section", () => {
    render(<DashboardStudent viewModel={mockViewModel} userName="Alex Student" />)

    expect(screen.getByText("Feedback & messages")).toBeInTheDocument()
    expect(screen.getByText("Recent feedback")).toBeInTheDocument()
    expect(screen.getByText("Messages")).toBeInTheDocument()
    expect(screen.getByText("95")).toBeInTheDocument()
    expect(screen.getByText("out of 100")).toBeInTheDocument()
    const msJohnsons = screen.getAllByText("Ms. Johnson")
    expect(msJohnsons.length).toBeGreaterThan(0)
    const previews = screen.getAllByText("Great work on your recent submission!")
    expect(previews.length).toBeGreaterThan(0)
  })

  it("does not show feedback section when no feedback", () => {
    const viewModelNoFeedback = {
      ...mockViewModel,
      feedback: [],
      messages: [],
    }

    render(<DashboardStudent viewModel={viewModelNoFeedback} userName="Alex Student" />)

    expect(screen.queryByText("Feedback & messages")).not.toBeInTheDocument()
  })

  it("displays classes section", () => {
    render(<DashboardStudent viewModel={mockViewModel} userName="Alex Student" />)

    expect(screen.getByText("Classes")).toBeInTheDocument()
    expect(screen.getByText("Algebra II")).toBeInTheDocument()
    expect(screen.getByText(/Mathematics · 30 students/)).toBeInTheDocument()
  })

  it("shows graded status badge in next action", () => {
    const viewModelGraded = {
      ...mockViewModel,
      nextAction: {
        ...mockViewModel.nextAction!,
        status: "graded" as const,
        grade: "92",
      },
    }

    render(<DashboardStudent viewModel={viewModelGraded} userName="Alex Student" />)

    expect(screen.getByText("Recently graded")).toBeInTheDocument()
    expect(screen.getByText("Graded")).toBeInTheDocument()
    expect(screen.getByText("92")).toBeInTheDocument()
  })

  it("groups timeline items by bucket", () => {
    const viewModelMultipleBuckets = {
      ...mockViewModel,
      timeline: [
        { ...mockViewModel.timeline[0], bucket: "today" as const },
        { ...mockViewModel.timeline[1], bucket: "this_week" as const },
        {
          id: "tl-3",
          title: "Final Project",
          type: "assignment" as const,
          classId: "class-eng",
          className: "English",
          classColor: "amber",
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          points: "300",
          isSubmitted: false,
          isGraded: false,
          bucket: "later" as const,
        },
      ],
    }

    render(<DashboardStudent viewModel={viewModelMultipleBuckets} userName="Alex Student" />)

    const dueTodayLabels = screen.getAllByText(/due today/i)
    expect(dueTodayLabels.length).toBeGreaterThan(0)
    const dueThisWeekLabels = screen.getAllByText(/due this week/i)
    expect(dueThisWeekLabels.length).toBeGreaterThan(0)
    const laterLabels = screen.getAllByText(/later/i)
    expect(laterLabels.length).toBeGreaterThan(0)
  })
})
