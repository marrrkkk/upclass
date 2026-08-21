import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"

import { PeopleTab } from "@/components/classes/people-tab"
import { ToastProvider } from "@/components/ui/toast"
import type { MemberData } from "@/types/classes"

const mocks = vi.hoisted(() => ({
  removeMember: vi.fn(),
}))

vi.mock("@/app/actions/class-detail", () => ({
  removeMember: mocks.removeMember,
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
      <ToastProvider>
        <PeopleTab
          classId="class-1"
          userId="student-1"
          userRole="student"
          members={members}
        />
      </ToastProvider>,
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
      <ToastProvider>
        <PeopleTab
          classId="class-1"
          userId="student-1"
          userRole="student"
          members={members}
        />
      </ToastProvider>,
    )

    expect(screen.queryByRole("button", { name: "Actions for Grace Hopper" })).not.toBeInTheDocument()

    rerender(
      <ToastProvider>
        <PeopleTab
          classId="class-1"
          userId="teacher-1"
          userRole="teacher"
          members={members}
        />
      </ToastProvider>,
    )

    expect(screen.getByRole("button", { name: "Actions for Grace Hopper" })).toBeInTheDocument()
  })

  it("removes a student optimistically and refreshes on success", async () => {
    const user = userEvent.setup()
    let resolveRemove: (value: { success: boolean; error?: string }) => void = () => {}
    mocks.removeMember.mockReturnValue(
      new Promise((resolve) => {
        resolveRemove = resolve
      }),
    )

    render(
      <ToastProvider>
        <PeopleTab
          classId="class-1"
          userId="teacher-1"
          userRole="teacher"
          members={members}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Actions for Grace Hopper" }))
    await user.click(await screen.findByRole("menuitem", { name: /remove from class/i }))
    await user.click(screen.getByRole("button", { name: "Remove" }))

    expect(mocks.removeMember).toHaveBeenCalledWith("class-1", "student-1")
    expect(screen.queryByRole("link", { name: /grace hopper/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /remove student/i })).not.toBeInTheDocument()

    await act(async () => {
      resolveRemove({ success: true })
    })

    await waitFor(() => {
      expect(useRouter().refresh).toHaveBeenCalled()
    })
  }, 15_000)

  it("restores the student row and shows a toast when removal fails", async () => {
    const user = userEvent.setup()
    mocks.removeMember.mockResolvedValue({
      success: false,
      error: "Members cannot be removed during an active session",
    })

    render(
      <ToastProvider>
        <PeopleTab
          classId="class-1"
          userId="teacher-1"
          userRole="teacher"
          members={members}
        />
      </ToastProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Actions for Grace Hopper" }))
    await user.click(await screen.findByRole("menuitem", { name: /remove from class/i }))
    await user.click(screen.getByRole("button", { name: "Remove" }))

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /grace hopper/i })).toBeInTheDocument()
    })
    expect(screen.getByText("Couldn't save changes")).toBeInTheDocument()
    expect(screen.getByText("Members cannot be removed during an active session")).toBeInTheDocument()
  }, 15_000)
})
