import { fireEvent, render, screen } from "@testing-library/react"

import { OnboardClient } from "@/components/onboard/onboard-client"

vi.mock("@/app/actions/profile", () => ({
  updateProfile: vi.fn(),
}))

vi.mock("@/lib/supabase-storage", () => ({
  useSupabaseUpload: () => ({
    startUpload: vi.fn(),
    isUploading: false,
  }),
}))

describe("OnboardClient", () => {
  it("preserves role selection while moving to profile details", () => {
    render(<OnboardClient initialData={{ name: "Ada Lovelace" }} />)

    expect(screen.getByRole("heading", { name: "Choose your role" })).toBeInTheDocument()

    const teacherRole = screen.getByRole("radio", { name: /Teacher/i })
    fireEvent.click(teacherRole)
    expect(teacherRole).toBeChecked()
    expect(teacherRole).toHaveAttribute("name", "account-role")
    expect(teacherRole).toBeRequired()

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }))

    expect(screen.getByRole("heading", { name: "Complete your profile" })).toBeInTheDocument()
    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace")
    expect(screen.getByRole("button", { name: /Get started/i })).toBeEnabled()
  })
})
