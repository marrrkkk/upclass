import { render, screen, within } from "@testing-library/react"

import { PeopleTab } from "@/components/classes/people-tab"
import type { MemberData } from "@/types/classes"

vi.mock("@/app/actions/class-detail", () => ({
  removeMember: vi.fn(),
}))

const members: MemberData[] = [
  {
    id: "teacher-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    image: null,
    role: "teacher",
  },
  {
    id: "student-1",
    name: "Grace Hopper",
    email: "grace@example.com",
    image: null,
    role: "student",
  },
]

describe("PeopleTab", () => {
  it("exposes teacher and student rows as semantic list items", () => {
    render(
      <PeopleTab
        classId="class-1"
        userId="student-1"
        userRole="student"
        members={members}
      />,
    )

    const teachers = screen.getByRole("list", { name: "Teachers" })
    const students = screen.getByRole("list", { name: "Students" })

    expect(within(teachers).getAllByRole("listitem")).toHaveLength(1)
    expect(within(students).getAllByRole("listitem")).toHaveLength(1)
    expect(within(teachers).getByRole("link", { name: /ada lovelace/i })).toHaveAttribute(
      "href",
      "/user/teacher-1",
    )
    expect(within(students).getByRole("link", { name: /grace hopper/i })).toHaveAttribute(
      "href",
      "/user/student-1",
    )
  })

  it("shows member removal actions only to teachers", () => {
    const { rerender } = render(
      <PeopleTab
        classId="class-1"
        userId="student-1"
        userRole="student"
        members={members}
      />,
    )

    expect(screen.queryByRole("button", { name: "Actions for Grace Hopper" })).not.toBeInTheDocument()

    rerender(
      <PeopleTab
        classId="class-1"
        userId="teacher-1"
        userRole="teacher"
        members={members}
      />,
    )

    expect(screen.getByRole("button", { name: "Actions for Grace Hopper" })).toBeInTheDocument()
  })
})
