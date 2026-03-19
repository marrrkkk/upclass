import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClassDetailTabs } from "@/components/classes/class-detail-tabs"

describe("ClassDetailTabs", () => {
  it("renders the class tabs and notifies when the user changes tabs", async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()

    const { rerender } = render(
      <ClassDetailTabs activeTab="stream" classColor="#0ea5e9" onTabChange={onTabChange} />,
    )

    expect(screen.getByRole("button", { name: "Stream" })).toHaveClass("text-primary")
    expect(screen.getByRole("button", { name: "Classwork" })).toHaveClass("text-muted-foreground")

    await user.click(screen.getByRole("button", { name: "Quizzes" }))

    expect(onTabChange).toHaveBeenCalledWith("quizzes")

    rerender(<ClassDetailTabs activeTab="quizzes" classColor="#0ea5e9" onTabChange={onTabChange} />)

    expect(screen.getByRole("button", { name: "Quizzes" })).toHaveClass("text-primary")
    expect(screen.getByRole("button", { name: "Quizzes" })).toHaveTextContent("Quizzes")
  })
})
