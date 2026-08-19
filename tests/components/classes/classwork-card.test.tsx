import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClassworkCard } from "@/components/classes/classwork-card"
import type { ClassworkData } from "@/types/classes"

const uploadMocks = vi.hoisted(() => ({
  startUpload: vi.fn(),
}))

vi.mock("@/lib/supabase-storage", () => ({
  useSupabaseUpload: () => ({
    startUpload: uploadMocks.startUpload,
    isUploading: false,
  }),
}))

const item: ClassworkData = {
  id: "work-1",
  title: "Reading response",
  description: "Respond to the assigned chapter.",
  type: "assignment",
  dueDate: null,
  points: "10",
  createdAt: "2026-03-19T00:00:00.000Z",
}

describe("ClassworkCard", () => {
  it("surfaces rejected attachment uploads and does not submit incomplete work", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    uploadMocks.startUpload.mockRejectedValueOnce(new Error("Upload unavailable"))

    render(
      <ClassworkCard
        allSubmissions={[]}
        classColor="#0e6b52"
        classId="class-1"
        deleting={false}
        error={null}
        item={item}
        pending={false}
        submission={undefined}
        userRole="student"
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onGrade={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Start work" }))
    const file = new File(["draft"], "response.txt", { type: "text/plain" })
    await user.upload(screen.getByLabelText("Choose files"), file)
    await user.click(screen.getByRole("button", { name: "Submit" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Upload unavailable")
    })
    expect(uploadMocks.startUpload).toHaveBeenCalledWith([file])
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
