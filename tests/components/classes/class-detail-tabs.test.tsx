import { render, screen } from "@testing-library/react"

import { ClassDetailTabProvider } from "@/components/classes/class-detail-tab-provider"
import { ClassDetailTabs } from "@/components/classes/class-detail-tabs"

describe("ClassDetailTabs", () => {
  it("renders the class tabs and highlights the selected tab", () => {
    const { rerender } = render(
      <ClassDetailTabProvider activeTab="stream" classId="class-123">
        <ClassDetailTabs activeTab="stream" classColor="#0ea5e9" classId="class-123" />
      </ClassDetailTabProvider>,
    )

    expect(screen.getByRole("button", { name: "Stream" })).toHaveClass("text-primary")
    expect(screen.getByRole("button", { name: "Classwork" })).toHaveClass("text-muted-foreground")

    rerender(
      <ClassDetailTabProvider activeTab="quizzes" classId="class-123">
        <ClassDetailTabs activeTab="quizzes" classColor="#0ea5e9" classId="class-123" />
      </ClassDetailTabProvider>,
    )

    expect(screen.getByRole("button", { name: "Quizzes" })).toHaveClass("text-primary")
    expect(screen.getByRole("button", { name: "Quizzes" })).toHaveTextContent("Quizzes")
  })
})
