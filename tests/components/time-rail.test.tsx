import { render, screen } from "@testing-library/react"

import { TimeRail } from "@/components/ui/time-rail"

describe("TimeRail", () => {
  it("renders chronological classwork with a live marker and tenant-safe targets", () => {
    const due = new Date()
    due.setHours(due.getHours() + 2)

    render(
      <TimeRail
        items={[
          {
            id: "work-1",
            title: "Reading response",
            date: due,
            href: "/academy/classes/class-1",
            courseName: "Literature",
            courseColor: "#ff00aa",
            state: "urgent",
          },
        ]}
      />,
    )

    expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument()
    expect(screen.getByText("Now")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Reading response/i })).toHaveAttribute(
      "href",
      "/academy/classes/class-1",
    )
    expect(screen.getByText("Due soon")).toBeInTheDocument()
  })
})
