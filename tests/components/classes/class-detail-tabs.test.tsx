import { render, screen } from "@testing-library/react"

import { ClassDetailTabs } from "@/components/classes/class-detail-tabs"

describe("ClassDetailTabs", () => {
  it("renders the class tabs and links to the selected class routes", () => {
    const { rerender } = render(
      <ClassDetailTabs activeTab="stream" classColor="#0ea5e9" classId="class-123" />,
    )

    expect(screen.getByRole("link", { name: "Stream" })).toHaveClass("text-primary")
    expect(screen.getByRole("link", { name: "Classwork" })).toHaveClass("text-muted-foreground")
    expect(screen.getByRole("link", { name: "Stream" })).toHaveAttribute("href", "/classes/class-123")
    expect(screen.getByRole("link", { name: "Quizzes" })).toHaveAttribute("href", "/classes/class-123?tab=quizzes")

    rerender(<ClassDetailTabs activeTab="quizzes" classColor="#0ea5e9" classId="class-123" />)

    expect(screen.getByRole("link", { name: "Quizzes" })).toHaveClass("text-primary")
    expect(screen.getByRole("link", { name: "Quizzes" })).toHaveTextContent("Quizzes")
  })
})
