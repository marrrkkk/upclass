import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClassCard } from "@/components/classes/class-card"
import { ClassesGrid } from "@/components/classes/classes-grid"
import type { ClassCardData } from "@/types/classes"

describe("ClassCard", () => {
  it("renders a course card with truthful class information", () => {
    const { container } = render(<ClassCard data={createClassCardData()} onHoverStart={vi.fn()} onHoverEnd={vi.fn()} />)

    const link = screen.getByRole("link", { name: /advanced ui/i })
    expect(link).toHaveAttribute("href", "/classes/class-1")
    expect(link).toHaveAttribute("data-slot", "class-card")
    expect(link).toHaveAttribute("data-layout", "grid")
    expect(link).toHaveAttribute("data-course-tone")
    expect(link).toHaveClass("flex", "h-full", "flex-col", "overflow-hidden", "bg-card", "shadow-e1")

    const hero = link.querySelector('[data-slot="course-hero"]')
    expect(hero).toBeInTheDocument()
    expect(hero).toHaveAttribute("data-tone")
    expect(hero).toHaveClass("h-36")
    expect(hero).toHaveTextContent("AU")

    const title = screen.getByRole("heading", { level: 2, name: "Advanced UI" })
    expect(title).toHaveClass("line-clamp-2", "group-hover:text-primary-strong")

    expect(link).toHaveAccessibleName(/12 students/i)
    expect(link).toHaveAccessibleName(/4 classwork items/i)
    expect(link).toHaveAccessibleName(/Ada Lovelace/i)
    expect(screen.getByText("Mon, Wed 10:00 AM")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("12 students")).toBeInTheDocument()
    expect(screen.getByText("Design delightful interfaces")).toBeInTheDocument()
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    expect(screen.queryByText(/Taught by/)).not.toBeInTheDocument()

    // No role eyebrow above the title, and no raw colour values in the DOM.
    expect(screen.queryByText("Teaching")).not.toBeInTheDocument()
    expect(screen.queryByText("Enrolled")).not.toBeInTheDocument()
    expect(container.querySelector("[style]")).not.toBeInTheDocument()
  })

  it("leads the roster stack with the teacher, then real student faces", () => {
    render(<ClassCard data={createClassCardData()} onHoverStart={vi.fn()} onHoverEnd={vi.fn()} />)

    const stack = screen.getByRole("group", { name: "Ada Lovelace and 12 students" })
    const avatars = stack.querySelectorAll('[data-slot="avatar"]')
    expect(avatars[0]).toHaveTextContent("AL")
    expect(screen.getByText("BW")).toBeInTheDocument()
    expect(screen.getByText("CL")).toBeInTheDocument()
    expect(screen.getByText("DR")).toBeInTheDocument()
    // Four faces fit (teacher plus three students), and the counter covers the rest.
    expect(screen.queryByText("EK")).not.toBeInTheDocument()
    expect(stack).toHaveTextContent("+9")
  })

  it("stamps the card with a relative last-changed time", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-19T05:00:00.000Z"))

    try {
      render(<ClassCard data={createClassCardData()} onHoverStart={vi.fn()} onHoverEnd={vi.fn()} />)

      const stamp = screen.getByRole("link", { name: /advanced ui/i }).querySelector("time")
      expect(stamp).toHaveAttribute("datetime", "2026-03-19T00:00:00.000Z")
      expect(stamp).toHaveTextContent("5h ago")
    } finally {
      vi.useRealTimers()
    }
  })

  it("lays the unified class collection out as a width-driven card grid", () => {
    render(
      <ClassesGrid searchQuery="" classes={[createClassCardData(), createClassCardData({ id: "class-2", title: "Design Systems", role: "enrolled" })]} onHoverStart={vi.fn()} onHoverEnd={vi.fn()} />,
    )

    const list = screen.getByRole("list", { name: "Classes" })
    expect(list).toHaveClass("grid", "grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]")
    expect(list).toHaveAttribute("data-view", "grid")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(list.querySelectorAll('[data-slot="class-card"]')).toHaveLength(2)
  })

  it("keeps the teacher stack, chips, and stamp when roster data is missing", () => {
    render(
      <ClassCard
        data={createClassCardData({
          teacherName: null,
          teacherImage: null,
          category: null,
          schedule: null,
          classworkCount: 0,
          enrolledCount: 0,
          students: [],
        })}
        onHoverStart={vi.fn()}
        onHoverEnd={vi.fn()}
      />,
    )

    // No category chip, no "Taught by" line — an empty roster is stated instead.
    expect(screen.queryByText("Course")).not.toBeInTheDocument()
    expect(screen.queryByText(/Taught by/)).not.toBeInTheDocument()
    expect(screen.getByText("No students yet")).toBeInTheDocument()
    // The stack still renders the teacher's face so a new class never looks broken.
    expect(screen.getByRole("group", { name: "Teacher" })).toBeInTheDocument()
    expect(screen.getByText("Teacher")).toBeInTheDocument()
    expect(screen.queryByText("Design")).not.toBeInTheDocument()
  })

  it("calls hover callbacks with the organization-aware class href", async () => {
    const user = userEvent.setup()
    const onHoverStart = vi.fn()
    const onHoverEnd = vi.fn()
    render(<ClassCard data={createClassCardData()} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} />)

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
    gradeLevel: "grade_10",
    customGrade: null,
    section: null,
    category: "Design",
    color: "#0e6b52",
    schedule: "Mon, Wed 10:00 AM",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    enrolledCount: 12,
    classworkCount: 4,
    students: [
      { id: "student-1", name: "Bea Wu", image: null },
      { id: "student-2", name: "Cai Lin", image: null },
      { id: "student-3", name: "Dee Ray", image: null },
      { id: "student-4", name: "Eve Kim", image: null },
    ],
    role: "teaching",
    teacherName: "Ada Lovelace",
    teacherImage: null,
    ...overrides,
  }
}