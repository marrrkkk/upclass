import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClassesClient } from "@/components/classes/classes-client"
import type { ClassCardData } from "@/types/classes"

vi.mock("@/hooks/classes/use-classes-data", () => ({
  useClassesData: ({ teachingClasses, enrolledClasses }: { teachingClasses: ClassCardData[]; enrolledClasses: ClassCardData[] }) => ({
    filteredClasses: [...teachingClasses, ...enrolledClasses],
    prefetchOnHover: vi.fn(),
    cancelPrefetch: vi.fn(),
  }),
}))

describe("ClassesClient", () => {
  it("keeps class actions in the page and shows one combined collection", () => {
    renderClassesClient()

    const pageHeading = screen.getByRole("heading", { level: 1, name: "Classes" })
    const headingRegion = pageHeading.closest('[data-slot="page-heading"]')

    expect(headingRegion).toContainElement(screen.getByRole("button", { name: "Join class" }))
    expect(headingRegion).toContainElement(screen.getByRole("button", { name: "Create class" }))
    expect(screen.getByRole("button", { name: "Join class" })).toHaveAttribute("data-variant", "secondary")
    expect(screen.getByRole("button", { name: "Create class" })).toHaveAttribute("data-variant", "default")
    expect(headingRegion).not.toHaveClass("border-b")
    const filters = screen.getByRole("search", { name: "Class filters" })
    expect(filters).not.toHaveClass("bg-primary-border/50", "border-b")
    expect(screen.getByRole("searchbox", { name: "Search classes" })).toHaveClass("border-0")
    expect(screen.getByRole("list", { name: "Classes" })).toBeInTheDocument()
    expect(screen.getByText("Interface Design")).toBeInTheDocument()
    expect(screen.getByText("Computer Science")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Teaching" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Enrolled" })).not.toBeInTheDocument()
    expect(screen.getByRole("search", { name: "Class filters" })).toHaveTextContent("2 classes")
  })

  it("provides clearable search and explicit sorting", async () => {
    const user = userEvent.setup()
    renderClassesClient()

    const search = screen.getByRole("searchbox", { name: "Search classes" })
    await user.type(search, "science")
    expect(search).toHaveValue("science")
    await user.click(screen.getByRole("button", { name: "Clear search" }))
    expect(search).toHaveValue("")

    const sort = screen.getByRole("combobox", { name: "Sort classes" })
    expect(sort).toHaveTextContent("Newest first")
    sort.focus()
    await user.keyboard("{Enter}{ArrowDown}{Enter}")
    expect(sort).toHaveTextContent("Oldest first")
  })
})

describe("ClassesClient streaming", () => {
  it("renders the header and search controls instantly and streams the grid", async () => {
    let resolvePromise: (data: {
      teachingClasses: ClassCardData[]
      enrolledClasses: ClassCardData[]
    }) => void = () => {}
    const classesPromise = new Promise<{
      teachingClasses: ClassCardData[]
      enrolledClasses: ClassCardData[]
    }>((resolve) => {
      resolvePromise = resolve
    })

    let container: HTMLElement | undefined
    await act(async () => {
      container = render(
        <ClassesClient
          classesPromise={classesPromise}
          isAuthenticated
          canCreateClass
          orgSlug="academy"
        />,
      ).container
    })

    // The static shell paints immediately: real title, actions, and controls.
    expect(screen.getByRole("heading", { level: 1, name: "Classes" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Join class" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create class" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Search classes" })).toBeInTheDocument()

    // The grid region shows its skeleton while the promise is pending.
    expect(container!.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)

    await act(async () => {
      resolvePromise({
        teachingClasses: [createClass("teaching-1", "Interface Design", "teaching")],
        enrolledClasses: [],
      })
    })

    expect(await screen.findByRole("list", { name: "Classes" })).toBeInTheDocument()
    expect(screen.getByText("Interface Design")).toBeInTheDocument()
    expect(screen.getByRole("search", { name: "Class filters" })).toHaveTextContent("1 class")
  })
})

function renderClassesClient() {
  return render(
    <ClassesClient
      teachingClasses={[createClass("teaching-1", "Interface Design", "teaching")]}
      enrolledClasses={[createClass("enrolled-1", "Computer Science", "enrolled")]}
      isAuthenticated
      canCreateClass
      orgSlug="academy"
    />,
  )
}

function createClass(id: string, title: string, role: "teaching" | "enrolled"): ClassCardData {
  return {
    id,
    title,
    description: null,
    gradeLevel: "grade_10",
    customGrade: null,
    section: null,
    category: "Course",
    color: null,
    schedule: null,
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
    enrolledCount: 10,
    role,
    teacherName: "Ada Lovelace",
    teacherImage: null,
  }
}
