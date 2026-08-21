import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

import { HomeAiCue } from "@/components/home/home-ai-cue"
import type { StudentActionQueueItem, TeacherActionQueueItem } from "@/components/home/home-action-queue"

const mockOpenFor = vi.fn()
const mockSetOpen = vi.fn()

vi.mock("@/components/ai/ai-panel-provider", () => ({
  useAiPanel: () => ({
    openFor: mockOpenFor,
    setOpen: mockSetOpen,
  }),
}))

describe("HomeAiCue", () => {
  it("renders contextual prompts for student with overdue work and opens AI panel seed", async () => {
    const user = userEvent.setup()
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
        isSubmitted: false,
      },
    ]

    render(<HomeAiCue queueItems={studentItems} role="student" totalClasses={3} />)

    expect(screen.getByText("AI Assistant Cue")).toBeInTheDocument()
    expect(screen.getByText("Break down my overdue assignments")).toBeInTheDocument()

    const promptBtn = screen.getByRole("button", { name: /Break down my overdue assignments/i })
    await user.click(promptBtn)

    expect(mockOpenFor).toHaveBeenCalledWith({
      surface: "class",
      entityId: "class-1",
      label: "AP Calculus",
    })
  })

  it("renders contextual prompts for teacher with submissions to grade", async () => {
    const user = userEvent.setup()
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
        attachmentCount: 1,
      },
    ]

    render(<HomeAiCue queueItems={teacherItems} role="teacher" totalClasses={2} />)

    expect(screen.getByText("Draft feedback for Alice Smith")).toBeInTheDocument()

    const promptBtn = screen.getByRole("button", { name: /Draft feedback for Alice Smith/i })
    await user.click(promptBtn)

    expect(mockOpenFor).toHaveBeenCalledWith({
      surface: "class",
      entityId: "class-eng",
      label: "AP English",
    })
  })
})
