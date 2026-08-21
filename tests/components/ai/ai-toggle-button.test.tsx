// @vitest-environment jsdom

import { describe, expect, test } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { AiPanelProvider } from "@/components/ai/ai-panel-provider"
import { AiToggleButton } from "@/components/ai/ai-toggle-button"

describe("AiToggleButton", () => {
  test("toggles the panel with correct a11y attributes", async () => {
    const user = userEvent.setup()
    render(
      <AiPanelProvider>
        <AiToggleButton />
      </AiPanelProvider>,
    )

    const button = screen.getByRole("button", { name: "Ask AI" })
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).toHaveAttribute("aria-controls", "assistant-panel")

    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")

    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  test("Ctrl+J toggles the panel without needing a click", async () => {
    const user = userEvent.setup()
    render(
      <AiPanelProvider>
        <AiToggleButton />
      </AiPanelProvider>,
    )

    const button = screen.getByRole("button", { name: "Ask AI" })
    await user.keyboard("{Control>}j{/Control}")
    expect(button).toHaveAttribute("aria-expanded", "true")
    await user.keyboard("{Control>}j{/Control}")
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  test("persists the open state across mounts", async () => {
    window.localStorage.setItem("upclass:ai-panel-open", "1")
    const user = userEvent.setup()
    const { unmount } = render(
      <AiPanelProvider>
        <AiToggleButton />
      </AiPanelProvider>,
    )
    expect(screen.getByRole("button", { name: "Ask AI" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )

    unmount()
    render(
      <AiPanelProvider>
        <AiToggleButton />
      </AiPanelProvider>,
    )
    expect(screen.getByRole("button", { name: "Ask AI" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    void user
  })
})