import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SettingsClient } from "@/components/settings/settings-client"

const mocks = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  deleteAccount: vi.fn(),
  startUpload: vi.fn(),
  clearAllCache: vi.fn(),
}))

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}))

vi.mock("@/app/actions/settings", () => ({
  updateSettings: mocks.updateSettings,
  deleteAccount: mocks.deleteAccount,
}))

vi.mock("@/lib/supabase-storage", () => ({
  useSupabaseUpload: () => ({ startUpload: mocks.startUpload, isUploading: false }),
}))

vi.mock("@/lib/background-cache", () => ({
  BackgroundCache: {
    getInstance: () => ({ clearAllCache: mocks.clearAllCache }),
  },
}))

vi.mock("@/lib/pwa-state", () => ({
  usePWAState: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      online: true,
      cacheReady: true,
      pendingActions: 0,
      warmedRoutes: ["/dashboard"],
      lastSyncAt: null,
      standalone: false,
    }),
}))

const userData = {
  id: "user-1",
  name: "Grace Hopper",
  email: "grace@example.com",
  image: null,
  bio: "Computer scientist",
  role: "teacher" as const,
  emailNotifications: true,
  pushNotifications: false,
  classNotifications: true,
  messageNotifications: false,
  profileVisibility: "public",
  showEmail: true,
  showClasses: true,
  showResources: false,
  createdAt: "2024-02-01T00:00:00.000Z",
}

beforeEach(() => {
  mocks.updateSettings.mockResolvedValue({ success: true })
  mocks.deleteAccount.mockResolvedValue({ success: true })
})

describe("SettingsClient", () => {
  it("presents settings as semantic sections", () => {
    render(<SettingsClient userData={userData} />)

    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("heading", { name: "Profile information" })).toBeInTheDocument()
    expect(screen.getByLabelText("Display name")).toHaveValue("Grace Hopper")
    expect(screen.getByLabelText("Account role")).toBeDisabled()
  })

  it("persists privacy visibility and disclosure switches with their exact semantics", async () => {
    const actor = userEvent.setup()
    render(<SettingsClient userData={userData} />)

    await actor.click(screen.getByRole("tab", { name: "Privacy" }))
    expect(screen.getByRole("combobox", { name: "Profile visibility" })).toHaveTextContent("Public")

    await actor.click(screen.getByRole("switch", { name: "Show email address" }))
    await actor.click(screen.getByRole("switch", { name: "Show resources" }))
    await actor.click(screen.getByRole("button", { name: "Save privacy" }))

    await waitFor(() => expect(mocks.updateSettings).toHaveBeenCalledTimes(1))
    const [formData, section] = mocks.updateSettings.mock.calls[0] as [FormData, string]
    expect(section).toBe("privacy")
    expect(Object.fromEntries(formData.entries())).toEqual({
      profileVisibility: "public",
      showEmail: "false",
      showClasses: "true",
      showResources: "true",
    })
  })

  it("persists notification switches", async () => {
    const actor = userEvent.setup()
    render(<SettingsClient userData={userData} />)

    await actor.click(screen.getByRole("tab", { name: "Notifications" }))
    await actor.click(screen.getByRole("switch", { name: "Direct messages" }))
    await actor.click(screen.getByRole("button", { name: "Save notifications" }))

    await waitFor(() => expect(mocks.updateSettings).toHaveBeenCalledTimes(1))
    const [formData, section] = mocks.updateSettings.mock.calls[0] as [FormData, string]
    expect(section).toBe("notifications")
    expect(Object.fromEntries(formData.entries())).toEqual({
      emailNotifications: "true",
      pushNotifications: "false",
      classNotifications: "true",
      messageNotifications: "true",
    })
  })
})
