// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ToastProvider } from "@/components/ui/toast"
import { ActionProposalCard, AiBubble, AiMarkdown } from "@/components/ai/chat-primitives"
import type { StructuredCard } from "@/lib/ai/tools/structured-outputs"

function renderWithToast(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe("AiMarkdown", () => {
  test("renders markdown content", () => {
    render(<AiMarkdown content={"**Bold** and `code` and [link](/classes)"} />)
    expect(screen.getByText("Bold")).toBeInTheDocument()
    expect(screen.getByText("code")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: "link" })
    expect(link).toHaveAttribute("href", "/classes")
  })

  test("renders external links with target blank", () => {
    render(<AiMarkdown content="[docs](https://example.com/docs)" />)
    const link = screen.getByRole("link", { name: "docs" })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })
})

describe("AiBubble", () => {
  test("renders a user message", () => {
    renderWithToast(
      <AiBubble role="user" content="When is homework due?" userName="Ada" orgSlug="acme" />,
    )
    expect(screen.getByText("When is homework due?")).toBeInTheDocument()
  })

  test("renders an assistant message with a structured card", () => {
    const card: StructuredCard = {
      _type: "classwork_list",
      title: "Classwork",
      items: [
        {
          id: "cw-1",
          title: "Problem set 3",
          description: null,
          type: "assignment",
          dueDate: "2026-08-20",
          points: "10",
          createdAt: "2026-08-01T00:00:00.000Z",
          url: "/acme/classes/c1/classwork/cw-1",
        },
      ],
    }
    renderWithToast(
      <AiBubble role="assistant" content="Here you go." structuredCards={[card]} orgSlug="acme" />,
    )
    expect(screen.getByText("Here you go.")).toBeInTheDocument()
    expect(screen.getByText("Problem set 3")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/acme/classes/c1/classwork/cw-1",
    )
  })

  test("shows an error message for failed responses", () => {
    renderWithToast(
      <AiBubble
        role="assistant"
        content=""
        status="failed"
        errorReason="rate_limit"
        orgSlug="acme"
      />,
    )
    expect(screen.getByText(/Too many requests/)).toBeInTheDocument()
  })
})

describe("ActionProposalCard", () => {
  test("executes the proposal via the actions endpoint", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: "Posted" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    renderWithToast(
      <ActionProposalCard
        orgSlug="acme"
        proposal={{
          action: "create_announcement",
          payload: { classId: "c1", content: "Reminder: submit by Friday" },
        }}
      />,
    )

    expect(screen.getByText("Post announcement")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Confirm/ }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/actions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            orgSlug: "acme",
            action: "create_announcement",
            payload: { classId: "c1", content: "Reminder: submit by Friday" },
          }),
        }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument()
    })
  })

  test("shows an error state when execution fails", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: "No permission" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    )

    renderWithToast(
      <ActionProposalCard
        orgSlug="acme"
        proposal={{ action: "create_classwork", payload: { classId: "c1", title: "HW" } }}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Confirm/ }))

    await waitFor(() => {
      expect(screen.getByText(/Execution failed/)).toBeInTheDocument()
    })
  })
})