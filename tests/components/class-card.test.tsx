import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClassCard } from "@/components/classes/class-card"
import type { ClassCardData } from "@/types/classes"

describe("ClassCard", () => {
  it("renders the main class information and category badge", () => {
    render(
      <ClassCard data={createClassCardData()} onHoverStart={vi.fn()} onHoverEnd={vi.fn()} />,
    )

    expect(screen.getByRole("link", { name: /advanced ui/i })).toHaveAttribute("href", "/classes/class-1")
    expect(screen.getByText("12 enrolled")).toBeInTheDocument()
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    expect(screen.getByText("Design")).toBeInTheDocument()
  })

  it("falls back when teacher details are missing", () => {
    render(
      <ClassCard
        data={createClassCardData({
          teacherName: null,
          teacherImage: null,
          category: null,
        })}
        onHoverStart={vi.fn()}
        onHoverEnd={vi.fn()}
      />,
    )

    expect(screen.getByText("Unknown Teacher")).toBeInTheDocument()
    expect(screen.getByText("T")).toBeInTheDocument()
    expect(screen.queryByText("Design")).not.toBeInTheDocument()
  })

  it("calls hover callbacks with the class href", async () => {
    const user = userEvent.setup()
    const onHoverStart = vi.fn()
    const onHoverEnd = vi.fn()

    render(
      <ClassCard
        data={createClassCardData()}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
      />,
    )

    const link = screen.getByRole("link", { name: /advanced ui/i })
    await user.hover(link)
    await user.unhover(link)

    expect(onHoverStart).toHaveBeenCalledWith("/classes/class-1")
    expect(onHoverEnd).toHaveBeenCalledWith("/classes/class-1")
  })
})

function createClassCardData(overrides: Partial<ClassCardData> = {}): ClassCardData {
  return {
    id: "class-1",
    title: "Advanced UI",
    description: "Design delightful interfaces",
    category: "Design",
    color: "#3b82f6",
    schedule: null,
    createdAt: "2026-03-19T00:00:00.000Z",
    enrolledCount: 12,
    role: "teaching",
    teacherName: "Ada Lovelace",
    teacherImage: null,
    ...overrides,
  }
}
