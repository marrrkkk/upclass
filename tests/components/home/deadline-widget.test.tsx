import { render, screen } from "@testing-library/react"

import { DeadlineWidget } from "@/components/home/deadline-widget"

vi.mock("@/hooks/use-organization-path", () => ({
  useOrganizationPath: () => (path: string) => `/academy${path}`,
}))

vi.mock("@/hooks/use-prefetch", () => ({
  usePrefetch: () => ({
    prefetchOnHover: vi.fn(),
    cancelPrefetch: vi.fn(),
  }),
}))

describe("DeadlineWidget", () => {
  it("uses a safe course swatch and keeps the class navigation target", () => {
    const { container } = render(
      <DeadlineWidget
        role="student"
        deadlines={[
          {
            id: "deadline-1",
            title: "Reading response",
            type: "assignment",
            dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
            classId: "course-1",
            className: "Literature",
            classColor: "#ff00aa",
            points: "10",
          },
        ]}
      />,
    )

    expect(screen.getByRole("link", { name: /Reading response/i })).toHaveAttribute(
      "href",
      "/academy/classes/course-1",
    )
    expect(screen.getByText("Next up")).toBeInTheDocument()
    expect(screen.getByText("Due soon")).toBeInTheDocument()

    const swatch = container.querySelector('[data-slot="course-swatch"]')
    expect(swatch).toHaveAttribute("data-tone")
    expect(swatch).not.toHaveAttribute("style")
  })
})
