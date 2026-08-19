// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ChatThread, type ChatInitialMessage } from "@/components/ai/chat-thread"
import { ToastProvider } from "@/components/ui/toast"

const mocks = vi.hoisted(() => ({
  useChat: vi.fn(),
  transport: vi.fn(),
  scrollToBottom: vi.fn(),
}))

vi.mock("@ai-sdk/react", () => ({
  useChat: mocks.useChat,
}))

vi.mock("ai", () => ({
  DefaultChatTransport: mocks.transport,
}))

vi.mock("use-stick-to-bottom", () => ({
  useStickToBottom: () => ({
    scrollRef: { current: null },
    contentRef: { current: null },
    scrollToBottom: mocks.scrollToBottom,
  }),
}))

vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: "acme" }),
}))

function baseChat(overrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    status: "ready",
    error: undefined,
    sendMessage: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  }
}

const emptyMessages: ChatInitialMessage[] = []

function renderThread(options: {
  variant?: "page" | "panel"
  onBack?: () => void
  initialMessages?: ChatInitialMessage[]
} = {}) {
  return render(
    <ToastProvider>
      <ChatThread
        conversationId="conv-1"
        surface="dashboard"
        entityId="dashboard"
        initialMessages={options.initialMessages ?? emptyMessages}
        variant={options.variant ?? "page"}
        onBack={options.onBack}
      />
    </ToastProvider>,
  )
}

describe("ChatThread", () => {
  beforeEach(() => {
    mocks.useChat.mockReset()
    mocks.transport.mockReset()
    mocks.scrollToBottom.mockReset()
    mocks.useChat.mockReturnValue(baseChat())
  })

  test("connects to the assistant route with the conversation context", () => {
    renderThread()
    expect(mocks.transport).toHaveBeenCalledWith(
      expect.objectContaining({
        api: "/api/ai/assistant",
        body: expect.objectContaining({
          orgSlug: "acme",
          conversationId: "conv-1",
          surface: "dashboard",
          entityId: "dashboard",
        }),
      }),
    )
  })

  test("sends a message on Enter", async () => {
    const user = userEvent.setup()
    const sendMessage = vi.fn()
    mocks.useChat.mockReturnValue(baseChat({ sendMessage }))

    renderThread()
    await user.type(screen.getByPlaceholderText("Ask the assistant…"), "When is homework due?{Enter}")
    expect(sendMessage).toHaveBeenCalledWith({
      parts: [{ type: "text", text: "When is homework due?" }],
    })
  })

  test("renders initial history as bubbles", () => {
    renderThread({
      initialMessages: [
        { id: "m1", role: "user", content: "Hi", status: "completed" },
        { id: "m2", role: "assistant", content: "Hello!", status: "completed" },
      ],
    })
    expect(screen.getByText("Hi")).toBeInTheDocument()
    expect(screen.getByText("Hello!")).toBeInTheDocument()
  })

  test("shows streaming state with a stop control and stops on click", async () => {
    const user = userEvent.setup()
    const stop = vi.fn()
    mocks.useChat.mockReturnValue(
      baseChat({
        status: "streaming",
        stop,
        messages: [
          {
            id: "live-1",
            role: "assistant",
            parts: [{ type: "text", text: "Let me look…" }],
          },
        ],
      }),
    )

    renderThread()
    expect(screen.getByText("Let me look…")).toBeInTheDocument()
    const stopButton = screen.getByRole("button", { name: /Stop generating/ })
    await user.click(stopButton)
    expect(stop).toHaveBeenCalled()
  })

  test("renders a failed bubble with the error reason", () => {
    renderThread({
      initialMessages: [
        {
          id: "m3",
          role: "assistant",
          content: "",
          status: "failed",
          errorReason: "rate_limit",
        },
      ],
    })
    expect(screen.getByText(/Too many requests/)).toBeInTheDocument()
  })

  test("panel variant renders a back button and hides the page caption", () => {
    const onBack = vi.fn()
    renderThread({ variant: "panel", onBack })
    expect(screen.getByRole("button", { name: "Back to chat list" })).toBeInTheDocument()
    expect(screen.queryByText(/Ctrl\+J toggles the assistant panel/)).not.toBeInTheDocument()
  })

  test("panel variant back button invokes onBack", async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    renderThread({ variant: "panel", onBack })
    await user.click(screen.getByRole("button", { name: "Back to chat list" }))
    expect(onBack).toHaveBeenCalled()
  })
})