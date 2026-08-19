import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ToastProvider, useToast } from "@/components/ui/toast"

function ToastTrigger() {
  const toast = useToast()
  return <button type="button" onClick={() => toast.success("Class published", "Students can now see it.")}>Publish</button>
}

describe("ToastProvider", () => {
  it("announces semantic success feedback and allows dismissal", async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Publish" }))

    const toast = screen.getByRole("status")
    expect(toast).toHaveAttribute("data-tone", "success")
    expect(screen.getByText("Class published")).toBeInTheDocument()
    expect(screen.getByText("Students can now see it.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Dismiss Class published" }))
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
