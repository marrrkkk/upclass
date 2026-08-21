import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { GradebookTab } from "@/components/classes/gradebook-tab"
import type { ClassworkData, MemberData, QuizData, SubmissionData } from "@/types/classes"

const actionsMocks = vi.hoisted(() => ({
  gradeSubmission: vi.fn(),
  gradeQuizAttempt: vi.fn(),
}))

vi.mock("@/app/actions/class-detail", () => ({
  gradeSubmission: actionsMocks.gradeSubmission,
}))

vi.mock("@/app/actions/quizzes", () => ({
  gradeQuizAttempt: actionsMocks.gradeQuizAttempt,
}))

const members: MemberData[] = [
  { id: "student-1", name: "Alice Student", email: "alice@example.com", image: null, role: "student" },
  { id: "student-2", name: "Bob Pupil", email: "bob@example.com", image: null, role: "student" },
]

const classwork: ClassworkData[] = [
  {
    id: "work-1",
    title: "Reading response",
    description: null,
    type: "assignment",
    dueDate: null,
    points: "10",
    createdAt: "2026-03-19T00:00:00.000Z",
  },
  {
    id: "material-1",
    title: "Syllabus",
    description: null,
    type: "material",
    dueDate: null,
    points: null,
    createdAt: "2026-03-19T00:00:00.000Z",
  },
]

const submissions: SubmissionData[] = [
  {
    id: "sub-1",
    classworkId: "work-1",
    studentId: "student-1",
    content: "Done",
    fileUrl: null,
    fileName: null,
    status: "graded",
    grade: "8",
    feedback: null,
    submittedAt: "2026-03-20T10:00:00.000Z",
    gradedAt: "2026-03-21T10:00:00.000Z",
    attachments: [],
    revisions: [],
    gradingHistory: [],
    student: { id: "student-1", name: "Alice Student", image: null },
  },
  {
    id: "sub-2",
    classworkId: "work-1",
    studentId: "student-2",
    content: "Submitted draft",
    fileUrl: null,
    fileName: null,
    status: "submitted",
    grade: null,
    feedback: null,
    submittedAt: "2026-03-22T10:00:00.000Z",
    gradedAt: null,
    attachments: [],
    revisions: [],
    gradingHistory: [],
    student: { id: "student-2", name: "Bob Pupil", image: null },
  },
]

const baseQuiz: QuizData = {
  id: "quiz-1",
  classId: "class-123",
  title: "Unit 1 Check",
  description: null,
  status: "published",
  dueDate: null,
  timeLimitSeconds: "600",
  totalPoints: "20",
  createdBy: "teacher-1",
  createdAt: "2026-03-18T00:00:00.000Z",
  updatedAt: "2026-03-18T00:00:00.000Z",
  questions: [],
  attempt: null,
  answers: [],
  attempts: [],
}

describe("GradebookTab", () => {
  it("renders a matrix of students by gradeable items with averages", () => {
    const quizzes: QuizData[] = [
      {
        ...baseQuiz,
        attempts: [
          { id: "attempt-1", quizId: "quiz-1", studentId: "student-1", status: "graded", score: "15", submittedAt: "2026-03-20T10:00:00.000Z", gradedAt: "2026-03-21T10:00:00.000Z", timeSpentSeconds: "300" },
          { id: "attempt-2", quizId: "quiz-1", studentId: "student-2", status: "pending_review", score: null, submittedAt: "2026-03-22T10:00:00.000Z", gradedAt: null, timeSpentSeconds: "310" },
        ],
      },
      { ...baseQuiz, id: "draft-quiz", title: "Draft quiz", status: "draft", attempts: [] },
    ]

    render(
      <GradebookTab classId="class-123" members={members} classwork={classwork} submissions={submissions} quizzes={quizzes} />,
    )

    expect(screen.getByRole("columnheader", { name: /reading response/i })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /unit 1 check/i })).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: /draft quiz/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: /syllabus/i })).not.toBeInTheDocument()

    expect(screen.getByText("Alice Student")).toBeInTheDocument()
    expect(screen.getByText("Bob Pupil")).toBeInTheDocument()

    expect(screen.getByRole("button", { name: "8/10" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "15/20" })).toBeInTheDocument()
    expect(screen.getByText("Submitted")).toBeInTheDocument()
    expect(screen.getByText("Pending")).toBeInTheDocument()

    expect(screen.getByText("77%")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("opens the classwork grading dialog from a submitted cell", async () => {
    const user = userEvent.setup()

    render(
      <GradebookTab classId="class-123" members={members} classwork={classwork} submissions={submissions} quizzes={[]} />,
    )

    const submittedCell = screen.getByRole("button", { name: "Submitted" })
    await user.click(submittedCell)

    const dialog = screen.getByRole("dialog", { name: /review submission/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/Bob Pupil/i)).toBeInTheDocument()
  })

  it("opens the quiz review dialog from an attempt cell", async () => {
    const user = userEvent.setup()

    const quizzes: QuizData[] = [
      {
        ...baseQuiz,
        attempts: [
          { id: "attempt-1", quizId: "quiz-1", studentId: "student-1", status: "graded", score: "15", submittedAt: "2026-03-20T10:00:00.000Z", gradedAt: "2026-03-21T10:00:00.000Z", timeSpentSeconds: "300" },
        ],
      },
    ]

    render(
      <GradebookTab classId="class-123" members={members} classwork={classwork} submissions={submissions} quizzes={quizzes} />,
    )

    const attemptCell = screen.getByRole("button", { name: "15/20" })
    await user.click(attemptCell)

    expect(screen.getByRole("dialog", { name: /review quiz attempts/i })).toBeInTheDocument()
    expect(actionsMocks.gradeSubmission).not.toHaveBeenCalled()
  })

  it("shows an empty state when there is nothing gradeable", () => {
    render(
      <GradebookTab classId="class-123" members={members} classwork={[]} submissions={[]} quizzes={[]} />,
    )

    expect(screen.getByText("No gradeable items yet")).toBeInTheDocument()
  })
})