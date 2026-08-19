import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  startUpload: vi.fn(),
}))

vi.mock("@/app/actions/profile", () => ({
  updateProfile: mocks.updateProfile,
}))

vi.mock("@/lib/supabase-storage", () => ({
  useSupabaseUpload: () => ({ startUpload: mocks.startUpload, isUploading: false }),
}))

vi.mock("next/dynamic", () => ({
  default: () =>
    ({
      open,
      onOpenChange,
      onComplete,
    }: {
      open: boolean
      onOpenChange: (open: boolean) => void
      onComplete: (blob: Blob) => void
    }) =>
      open ? (
        <button
          type="button"
          onClick={() => {
            onComplete(new Blob(["cropped"], { type: "image/jpeg" }))
            onOpenChange(false)
          }}
        >
          Apply test crop
        </button>
      ) : null,
}))

const user = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  image: "https://files.example/old-avatar.jpg",
  cover: "https://files.example/old-cover.jpg",
  coverColor: "#8b5cf6",
  bio: "Mathematics and computing.",
  role: "teacher" as const,
}

beforeEach(() => {
  mocks.updateProfile.mockResolvedValue({ success: true })
  mocks.startUpload
    .mockResolvedValueOnce([
      {
        url: "https://files.example/new-avatar.jpg",
        name: "avatar.jpg",
        size: "100",
        type: "image/jpeg",
      },
    ])
    .mockResolvedValueOnce([
      {
        url: "https://files.example/new-cover.jpg",
        name: "cover.jpg",
        size: "200",
        type: "image/jpeg",
      },
    ])
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn().mockReturnValue("blob:preview"),
  })
})

describe("EditProfileDialog", () => {
  it("uploads cropped avatar and cover files and preserves the legacy cover payload", async () => {
    const actor = userEvent.setup()
    render(<EditProfileDialog user={user} />)

    await actor.click(screen.getByRole("button", { name: "Edit profile" }))
    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
    expect(fileInputs).toHaveLength(2)

    await actor.upload(
      fileInputs[1],
      new File(["avatar"], "avatar-source.png", { type: "image/png" }),
    )
    fireEvent.click(
      await screen.findByRole("button", { name: "Apply test crop", hidden: true }),
    )

    await actor.upload(
      fileInputs[0],
      new File(["cover"], "cover-source.png", { type: "image/png" }),
    )
    fireEvent.click(
      await screen.findByRole("button", { name: "Apply test crop", hidden: true }),
    )

    await actor.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledTimes(1))
    expect(mocks.startUpload).toHaveBeenCalledTimes(2)
    const formData = mocks.updateProfile.mock.calls[0][0] as FormData
    expect(Object.fromEntries(formData.entries())).toMatchObject({
      name: "Ada Lovelace",
      bio: "Mathematics and computing.",
      image: "https://files.example/new-avatar.jpg",
      cover: "https://files.example/new-cover.jpg",
      coverColor: "#8b5cf6",
      role: "teacher",
    })
  })
})
