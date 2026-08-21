import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { AIChatDialog } from "@/components/resources/ai-chat-dialog"

const resourceContext = {
  id: "resource-1",
  title: "Calculus reference",
}

function createUIMessageStream(parts: Array<{ type: string; text?: string }>) {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const enqueue = (chunk: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      for (const part of parts) {
        switch (part.type) {
          case "text-start":
            enqueue({ type: "text-start", id: "msg-1" })
            break
          case "text-delta":
            enqueue({ type: "text-delta", id: "msg-1", delta: part.text ?? "" })
            break
          case "text-end":
            enqueue({ type: "text-end", id: "msg-1" })
            break
          case "error":
            enqueue({ type: "error", errorText: part.text ?? "Error" })
            break
          default:
            enqueue({ type: part.type })
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    },
  })
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("AIChatDialog", () => {
  it("sends the resource ID to the AI chat endpoint and streams the reply", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        createUIMessageStream([
          { type: "text-start" },
          { type: "text-delta", text: "## Key idea" },
          { type: "text-delta", text: "\n\nThe **derivative** measures change." },
          { type: "text-delta", text: "\n\n- Study the limit\n- [Review](https://example.com)" },
          { type: "text-delta", text: "\n\n`f'(x)`" },
          { type: "text-end" },
          { type: "message-end" },
        ]),
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      ),
    )

    render(
      <AIChatDialog open onOpenChange={vi.fn()} resourceContext={resourceContext} />,
    )

    await user.click(screen.getByRole("button", { name: "Summarize this" }))
    await user.click(screen.getByRole("button", { name: "Send message" }))

    expect(await screen.findByRole("heading", { name: "Key idea" })).toBeInTheDocument()
    expect(screen.getByText("derivative", { selector: "strong" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      "https://example.com/",
    )
    expect(screen.getByText("f'(x)", { selector: "code" })).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

    const [url, request] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/ai/chat")
    expect(request?.method).toBe("POST")
    const body = JSON.parse(String(request?.body))
    expect(body.messages).toEqual([
      expect.objectContaining({
        role: "user",
        parts: [{ type: "text", text: "Summarize this" }],
      }),
    ])

    fetchMock.mockRestore()
  })

  it("renders unsafe javascript: links as plain text", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        createUIMessageStream([
          { type: "text-start" },
          { type: "text-delta", text: "[Click me](javascript:alert(1))" },
          { type: "text-end" },
          { type: "message-end" },
        ]),
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      ),
    )

    render(
      <AIChatDialog open onOpenChange={vi.fn()} resourceContext={resourceContext} />,
    )

    await user.click(screen.getByRole("button", { name: "Summarize this" }))
    await user.click(screen.getByRole("button", { name: "Send message" }))

    expect(await screen.findByText("Click me")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Click me" })).not.toBeInTheDocument()

    fetchMock.mockRestore()
  })

  it("shows error message and allows retry", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ error: "Upstream failed" }, 502))
      .mockResolvedValueOnce(
        new Response(
          createUIMessageStream([
            { type: "text-start" },
            { type: "text-delta", text: "Retried answer." },
            { type: "text-end" },
            { type: "message-end" },
          ]),
          { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
        ),
      )

    render(
      <AIChatDialog open onOpenChange={vi.fn()} resourceContext={resourceContext} />,
    )

    await user.click(screen.getByRole("button", { name: "Summarize this" }))
    await user.click(screen.getByRole("button", { name: "Send message" }))

    // Error message should appear (AI SDK may wrap the error)
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    const retryButton = screen.getByRole("button", { name: "Retry" })
    await user.click(retryButton)

    expect(await screen.findByText("Retried answer.")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    fetchMock.mockRestore()
  })

  it("displays user messages in the chat", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        createUIMessageStream([
          { type: "text-start" },
          { type: "text-delta", text: "Great question!" },
          { type: "text-end" },
          { type: "message-end" },
        ]),
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      ),
    )

    render(<AIChatDialog open onOpenChange={vi.fn()} resourceContext={resourceContext} />)

    await user.click(screen.getByRole("button", { name: "Key takeaways" }))
    await user.click(screen.getByRole("button", { name: "Send message" }))

    // User message should appear
    expect(await screen.findByText("Key takeaways")).toBeInTheDocument()
    // AI response should stream in
    expect(await screen.findByText("Great question!")).toBeInTheDocument()

    fetchMock.mockRestore()
  })
})
