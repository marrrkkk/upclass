import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClassDetailTabProvider } from "@/components/classes/class-detail-tab-provider"
import { ClassDetailTabs } from "@/components/classes/class-detail-tabs"

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
  usePathname: () => "/acme/classes/class-123",
  useSearchParams: () => new URLSearchParams("view=compact"),
}))

describe("ClassDetailTabs", () => {
  it("renders one dense responsive navigation and marks the selected tab", async () => {
    const { rerender } = render(
      <ClassDetailTabProvider activeTab="stream" classId="class-123" visibleTabs={["stream", "classwork", "quizzes", "people"]}>
        <ClassDetailTabs classId="class-123" visibleTabs={["stream", "classwork", "quizzes", "people"]} />
      </ClassDetailTabProvider>,
    )

    expect(screen.getByRole("navigation", { name: "Class sections" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Stream" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "Classwork" })).not.toHaveAttribute("aria-current")
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /whiteboard/i })).toHaveAttribute(
      "href",
      "/acme/classes/class-123/whiteboard",
    )

    rerender(
      <ClassDetailTabProvider activeTab="quizzes" classId="class-123" visibleTabs={["stream", "classwork", "quizzes", "people"]}>
        <ClassDetailTabs classId="class-123" visibleTabs={["stream", "classwork", "quizzes", "people"]} />
      </ClassDetailTabProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Quizzes" })).toHaveAttribute("aria-current", "page")
    })
    expect(screen.getByRole("button", { name: "Stream" })).not.toHaveAttribute("aria-current")
  })

  it("shows the gradebook tab for teachers only", () => {
    render(
      <ClassDetailTabProvider activeTab="stream" classId="class-123" visibleTabs={["stream", "classwork", "quizzes", "gradebook", "people"]}>
        <ClassDetailTabs classId="class-123" visibleTabs={["stream", "classwork", "quizzes", "gradebook", "people"]} />
      </ClassDetailTabProvider>,
    )

    expect(screen.getByRole("button", { name: "Gradebook" })).toBeInTheDocument()
  })

  it("preserves unrelated query values when changing tabs and removes the stream tab query", async () => {
    const user = userEvent.setup()

    render(
      <ClassDetailTabProvider activeTab="stream" classId="class-123" visibleTabs={["stream", "classwork", "quizzes", "people"]}>
        <ClassDetailTabs classId="class-123" visibleTabs={["stream", "classwork", "quizzes", "people"]} />
      </ClassDetailTabProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Classwork" }))
    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/acme/classes/class-123?view=compact&tab=classwork",
      { scroll: false },
    )
    expect(screen.getByRole("button", { name: "Classwork" })).toHaveAttribute("aria-current", "page")

    await user.click(screen.getByRole("button", { name: "Stream" }))
    expect(navigationMocks.replace).toHaveBeenLastCalledWith(
      "/acme/classes/class-123?view=compact",
      { scroll: false },
    )
  })
})
