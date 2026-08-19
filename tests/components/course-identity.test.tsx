import { render, screen } from "@testing-library/react"

import { CourseIdentity, CourseSwatch } from "@/components/ui/course-identity"

describe("CourseIdentity", () => {
  it("renders identity without passing stored colors into inline styles", () => {
    const { container } = render(
      <CourseIdentity
        title="Interaction Design"
        metadata="DES 204 · 18 learners"
        color="#0e6b52"
        courseKey="class-1"
      />,
    )

    expect(screen.getByText("Interaction Design")).toBeInTheDocument()
    expect(screen.getByText("DES 204 · 18 learners")).toBeInTheDocument()
    expect(container.querySelector("[style]")).not.toBeInTheDocument()
  })

  it("can expose a labeled swatch when it carries meaning", () => {
    render(<CourseSwatch value={null} courseKey="class-2" label="Biology course" />)
    expect(screen.getByRole("img", { name: "Biology course" })).toBeInTheDocument()
  })
})
