import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

describe("PWAInstallPrompt", () => {
  it("stays hidden until the browser fires the install prompt event", () => {
    render(<PWAInstallPrompt />)

    expect(screen.queryByRole("button", { name: /install/i })).not.toBeInTheDocument()
  })

  it("shows the install prompt and handles acceptance", async () => {
    const user = userEvent.setup()
    const prompt = vi.fn().mockResolvedValue(undefined)

    render(<PWAInstallPrompt />)
    await dispatchBeforeInstallPrompt({
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    })

    expect(await screen.findByText("Install UpClass")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /^install$/i }))

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(await screen.queryByRole("button", { name: /^install$/i })).not.toBeInTheDocument()
    expect(sessionStorage.getItem("pwa-install-prompt-seen")).toBe("true")
  })

  it("dismisses the prompt when the user closes it", async () => {
    const user = userEvent.setup()

    render(<PWAInstallPrompt />)
    await dispatchBeforeInstallPrompt()

    await user.click(screen.getByRole("button", { name: /dismiss install prompt/i }))

    expect(screen.queryByText("Install UpClass")).not.toBeInTheDocument()
    expect(sessionStorage.getItem("pwa-install-prompt-seen")).toBe("true")
  })

  it("does not show again after the session flag has been set", () => {
    sessionStorage.setItem("pwa-install-prompt-seen", "true")

    render(<PWAInstallPrompt />)
    void dispatchBeforeInstallPrompt()

    expect(screen.queryByText("Install UpClass")).not.toBeInTheDocument()
  })
})

async function dispatchBeforeInstallPrompt(
  overrides: Partial<{
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
  }> = {},
) {
  const event = new Event("beforeinstallprompt", {
    bubbles: true,
    cancelable: true,
  }) as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
  }

  event.prompt = overrides.prompt ?? vi.fn().mockResolvedValue(undefined)
  event.userChoice =
    overrides.userChoice ?? Promise.resolve({ outcome: "dismissed" as const })

  await act(async () => {
    window.dispatchEvent(event)
  })
}
