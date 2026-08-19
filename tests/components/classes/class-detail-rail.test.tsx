import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClassDetailRail } from "@/components/classes/class-detail-rail"
import type { ClassRailData } from "@/types/classes"

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
  usePathname: () => "/acme/classes/class-123",
  useSearchParams: () => new URLSearchParams(""),
}))

const teacherRail: ClassRailData = {
  needsGrading: [
    {
      id: "sub-1",
      kind: "classwork",
      itemId: "work-1",
      title: "Reading response",
      studentId: "student-1",
      studentName: "Alice Student",
      submittedAt: "2026-08-15T10:00:00.000Z",
    },
    {
      id: "attempt-1",
      kind: "quiz",
      itemId: "quiz-1",
      title: "Unit 1 Check",
      studentId: "student-2",
      studentName: "Bob Pupil",
      submittedAt: "2026-08-16T09:30:00.000Z",
    },
  ],
  gradingCounts: { classwork: 1, quizzes: 2 },
  myGrades: [],
  upcomingDue: [],
  nextDue: null,
}

const studentRail: ClassRailData = {
  needsGrading: [],
  gradingCounts: { classwork: 0, quizzes: 0 },
  myGrades: [
    {
      id: "sub-2",
      kind: "classwork",
      title: "Reading response",
      grade: "8",
      total: "10",
      status: "graded",
      updatedAt: "2026-08-14T10:00:00.000Z",
    },
    {
      id: "attempt-2",
      kind: "quiz",
      title: "Unit 1 Check",
      grade: null,
      total: "20",
      status: "pending_review",
      updatedAt: "2026-08-16T09:30:00.000Z",
    },
  ],
  upcomingDue: [
    {
      id: "work-2",
      kind: "classwork",
      title: "Essay draft",
      dueDate: "2026-08-22T23:59:00.000Z",
    },
  ],
  nextDue: "2026-08-22T23:59:00.000Z",
}

describe("ClassDetailRail (teacher)", () => {
  it("lists ungraded work with counts and opens the gradebook from the queue", async () => {
    const user = userEvent.setup()

    render(
      <ClassDetailRail classId="class-123" classCode="AB12CD" userRole="teacher" railData={teacherRail} />,
    )

    expect(screen.getByRole("heading", { name: "Needs grading" })).toBeInTheDocument()
    expect(screen.getByText("1 classwork · 2 quizzes")).toBeInTheDocument()
    expect(screen.getByText("Alice Student")).toBeInTheDocument()
    expect(screen.getByText("Bob Pupil")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /needs grading/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /pending review/i })).toBeInTheDocument()

    await user.click(screen.getByText("Alice Student"))
    expect(navigationMocks.push).toHaveBeenCalledWith("/acme/classes/class-123?tab=gradebook")

    expect(screen.getByRole("link", { name: /open gradebook/i })).toHaveAttribute(
      "href",
      "/acme/classes/class-123?tab=gradebook",
    )
  })

  it("shows the join code and quick create actions that target the right tab", async () => {
    const user = userEvent.setup()

    render(
      <ClassDetailRail classId="class-123" classCode="AB12CD" userRole="teacher" railData={teacherRail} />,
    )

    expect(screen.getByText("AB12CD")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copy join code/i })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /new announcement/i }))
    expect(navigationMocks.push).toHaveBeenLastCalledWith("/acme/classes/class-123?create=1")

    await user.click(screen.getByRole("button", { name: /new classwork/i }))
    expect(navigationMocks.push).toHaveBeenLastCalledWith("/acme/classes/class-123?tab=classwork&create=1")

    await user.click(screen.getByRole("button", { name: /new quiz/i }))
    expect(navigationMocks.push).toHaveBeenLastCalledWith("/acme/classes/class-123?tab=quizzes&create=1")
  })

  it("shows an empty state when nothing is waiting", () => {
    render(
      <ClassDetailRail classId="class-123" classCode="AB12CD" userRole="teacher" railData={studentRail} />,
    )

    expect(screen.getByText("Nothing waiting for review.")).toBeInTheDocument()
  })
})

describe("ClassDetailRail (student)", () => {
  it("summarizes own grades and upcoming due work", () => {
    render(
      <ClassDetailRail classId="class-123" classCode="AB12CD" userRole="student" railData={studentRail} />,
    )

    expect(screen.getByRole("heading", { name: "My grades" })).toBeInTheDocument()
    expect(screen.getByText("8 / 10")).toBeInTheDocument()
    expect(screen.getByText("Pending review")).toBeInTheDocument()

    expect(screen.getByRole("heading", { name: "Upcoming due" })).toBeInTheDocument()
    expect(screen.getByText("Essay draft")).toBeInTheDocument()

    expect(screen.getByRole("link", { name: /view my quiz attempts/i })).toHaveAttribute(
      "href",
      "/acme/classes/class-123?tab=quizzes",
    )
  })

  it("shows an empty state when there is nothing due", () => {
    render(
      <ClassDetailRail classId="class-123" classCode="AB12CD" userRole="student" railData={teacherRail} />,
    )

    expect(screen.getByText("No grades yet.")).toBeInTheDocument()
    expect(screen.getByText(/nothing due/i)).toBeInTheDocument()
  })
})