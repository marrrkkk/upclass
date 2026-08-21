import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect } from "vitest"

import {
  HomeActionQueue,
  type StudentActionQueueItem,
  type TeacherActionQueueItem,
} from "@/components/home/home-action-queue"

describe("HomeActionQueue", () => {
  it("renders student queue items with urgency order and badges", () => {
    const studentItems: StudentActionQueueItem[] = [
      {
        kind: "classwork",
        id: "cw-1",
        title: "Calculus Homework 1",
        type: "assignment",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue
        classId: "class-1",
        className: "AP Calculus",
        classColor: "blue",
        points: "100",
        isSubmitted: false,
      },
      {
        kind: "classwork",
        id: "cw-2",
        title: "Physics Quiz",
        type: "quiz",
        dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // Due today
        classId: "class-2",
        className: "Physics 101",
        classColor: "purple",
        points: "50",
        isSubmitted: false,
      },
      {
        kind: "classwork",
        id: "cw-3",
        title: "Chemistry Lab Report",
        type: "assignment",
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Due soon
        classId: "class-3",
        className: "Chemistry",
        classColor: "emerald",
        points: "25",
        isSubmitted: true,
      },
    ]

    render(<HomeActionQueue items={studentItems} role="student" />)

    expect(screen.getByText("Needs attention")).toBeInTheDocument()
    expect(screen.getByText("3 items need attention.")).toBeInTheDocument()
    expect(screen.getByText("Calculus Homework 1")).toBeInTheDocument()
    expect(screen.getByText("Overdue")).toBeInTheDocument()
    expect(screen.getByText("Physics Quiz")).toBeInTheDocument()
    expect(screen.getByText("Due today")).toBeInTheDocument()
    expect(screen.getByText("Chemistry Lab Report")).toBeInTheDocument()
    expect(screen.getByText("Completed")).toBeInTheDocument()
  })

  it("renders teacher queue items (submissions, unread questions, overdue alerts)", () => {
    const teacherItems: TeacherActionQueueItem[] = [
      {
        kind: "submission",
        id: "sub-1",
        submissionId: "sub-123",
        title: "Essay Draft",
        studentName: "Alice Smith",
        classId: "class-eng",
        className: "AP English",
        classColor: "amber",
        submittedAt: new Date().toISOString(),
        attachmentCount: 2,
      },
      {
        kind: "question",
        id: "unread-q",
        count: 3,
        title: "Student inquiries",
      },
      {
        kind: "overdue_alert",
        id: "overdue-a",
        count: 5,
        title: "Overdue submissions",
      },
    ]

    render(<HomeActionQueue items={teacherItems} role="teacher" />)

    expect(screen.getByText("Needs attention")).toBeInTheDocument()
    expect(screen.getByText("Essay Draft")).toBeInTheDocument()
    expect(screen.getByText("Needs grading")).toBeInTheDocument()
    expect(screen.getByText("Alice Smith · AP English")).toBeInTheDocument()
    expect(screen.getByText("2 files")).toBeInTheDocument()

    expect(screen.getByText("Student inquiries")).toBeInTheDocument()
    expect(screen.getByText("Unread question")).toBeInTheDocument()

    expect(screen.getByText("Overdue submissions")).toBeInTheDocument()
  })

  it("renders an empty state when there are no queue items", () => {
    render(<HomeActionQueue items={[]} role="student" />)

    expect(screen.getByText("All caught up")).toBeInTheDocument()
    expect(
      screen.getByText("No incomplete assignments need immediate attention."),
    ).toBeInTheDocument()
  })

  it("opens modal dialog when View all is clicked", async () => {
    const user = userEvent.setup()
    const studentItems: StudentActionQueueItem[] = [
      {
        kind: "classwork",
        id: "cw-1",
        title: "Calculus Homework 1",
        type: "assignment",
        dueDate: new Date(),
        classId: "class-1",
        className: "AP Calculus",
        classColor: "blue",
        isSubmitted: false,
      },
    ]

    render(<HomeActionQueue items={studentItems} role="student" />)

    const viewAllBtn = screen.getByRole("button", { name: /View all/i })
    await user.click(viewAllBtn)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("All upcoming tasks")).toBeInTheDocument()
  })
})
