// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { AiPanelProvider, useAiPanel } from "@/components/ai/ai-panel-provider"
import { AiSidePanel } from "@/components/ai/ai-side-panel"
import { ToastProvider } from "@/components/ui/toast"

const mocks = vi.hoisted(() => ({
  createEmptyChat: vi.fn(),
  deleteChat: vi.fn(),
  resolveClassConversationAction: vi.fn(),
  resetClassConversationAction: vi.fn(),
  startNewChat: vi.fn(),
  useChat: vi.fn(),
  transport: vi.fn(),
  scrollToBottom: vi.fn(),
}))

vi.mock("@/app/actions/ai", () => ({
  createEmptyChat: mocks.createEmptyChat,
  deleteChat: mocks.deleteChat,
  resolveClassConversationAction: mocks.resolveClassConversationAction,
  resetClassConversationAction: mocks.resetClassConversationAction,
  startNewChat: mocks.startNewChat,
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/acme/dashboard",
  useParams: () => ({ orgSlug: "acme" }),
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

vi.mock("@/components/ai/org-memory-manager", () => ({
  OrgMemoryManager: () => <div data-testid="org-memory-manager" />,
}))

type ConversationRow = { id: string; title: string; updatedAt: string | null }

function mockFetch({
  conversations = [],
  messages = [],
  missingConversationId,
}: {
  conversations?: ConversationRow[]
  messages?: unknown[]
  missingConversationId?: string
} = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes("/messages?limit=50")) {
      if (missingConversationId && url.includes(`/conversations/${missingConversationId}/`)) {
        return new Response(JSON.stringify({ error: "Conversation not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response(
        JSON.stringify({ messages, nextCursor: null, hasMore: false }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    }
    if (url.includes("/api/ai/conversations")) {
      return new Response(JSON.stringify({ conversations }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
  })
}

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

function SeedHarness() {
  const { openFor } = useAiPanel()
  return (
    <button type="button" onClick={() => openFor({ surface: "class", entityId: "cls-1", label: "Biology 101" })}>
      seed class
    </button>
  )
}

function renderPanel(organizationRole: "owner" | "admin" | "member" = "member") {
  window.localStorage.setItem("upclass:ai-panel-open", "1")
  return render(
    <ToastProvider>
      <AiPanelProvider>
        <AiSidePanel organizationRole={organizationRole} />
        <SeedHarness />
      </AiPanelProvider>
    </ToastProvider>,
  )
}

async function openHistory() {
  fireEvent.click(screen.getByRole("button", { name: "View conversation history" }))
  await waitFor(() => expect(screen.getByRole("button", { name: "View conversation history" })).toHaveAttribute("data-state", "open"))
}

describe("AiSidePanel", () => {
  beforeEach(() => {
    mocks.createEmptyChat.mockReset()
    mocks.deleteChat.mockReset()
    mocks.resolveClassConversationAction.mockReset()
    mocks.resetClassConversationAction.mockReset()
    mocks.useChat.mockReset()
    mocks.transport.mockReset()
    mocks.scrollToBottom.mockReset()
    mocks.useChat.mockReturnValue(baseChat())
    mocks.createEmptyChat.mockResolvedValue({ success: true, conversationId: "new-1" })
    mocks.resolveClassConversationAction.mockResolvedValue({
      success: true,
      conversationId: "cls-conv-1",
    })
    mocks.resetClassConversationAction.mockResolvedValue({
      success: true,
      conversationId: "cls-conv-2",
    })
    mocks.deleteChat.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  test("first open shows a blank chat instantly, then history opens on demand", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({
      conversations: [
        { id: "c1", title: "Homework help", updatedAt: new Date().toISOString() },
      ],
    })

    renderPanel()
    expect(screen.getByRole("heading", { name: "Ask me anything." })).toBeInTheDocument()
    expect(screen.queryByText("Starting conversation...")).not.toBeInTheDocument()

    await openHistory()
    await waitFor(() => {
      expect(screen.getByText("Homework help")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Homework help"))

    await waitFor(() => {
      expect(mocks.transport).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ conversationId: "c1", surface: "dashboard" }),
        }),
      )
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/ai/conversations/c1/messages?limit=50"),
      expect.any(Object),
    )
    expect(screen.queryByRole("button", { name: "Back to chat list" })).not.toBeInTheDocument()
  })

  test("inline new chat creates a dashboard conversation without redirecting", async () => {
    const user = userEvent.setup()
    mockFetch()

    renderPanel()
    await waitFor(() => expect(mocks.createEmptyChat).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole("button", { name: "Start a new chat" }))

    await waitFor(() => {
      expect(mocks.createEmptyChat).toHaveBeenLastCalledWith({
        orgSlug: "acme",
        surface: "dashboard",
        entityId: "dashboard",
      })
    })
    await waitFor(() => {
      expect(mocks.transport).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ conversationId: "new-1" }),
        }),
      )
    })
  })

  test("first-open recommendations become sendable when background creation resolves", async () => {
    const user = userEvent.setup()
    const sendMessage = vi.fn()
    mocks.useChat.mockImplementation(() => baseChat({ sendMessage }))
    let resolveConversation!: (value: { success: true; conversationId: string }) => void
    mocks.createEmptyChat.mockReturnValue(
      new Promise((resolve) => {
        resolveConversation = resolve
      }),
    )
    mockFetch()

    renderPanel()

    const recommendation = screen.getByRole("button", {
      name: "What homework is due this week?",
    })
    await user.click(recommendation)
    expect(sendMessage).not.toHaveBeenCalled()

    resolveConversation({ success: true, conversationId: "first-open-1" })

    await waitFor(() => {
      expect(mocks.transport).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ conversationId: "first-open-1" }),
        }),
      )
    })

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        parts: [{ type: "text", text: "What homework is due this week?" }],
      })
    })
  })

  test("history stays hidden until requested", async () => {
    mockFetch({ conversations: [{ id: "c1", title: "Homework help", updatedAt: null }] })

    renderPanel()

    expect(screen.getByRole("button", { name: "View conversation history" })).toBeInTheDocument()
    expect(screen.queryByText("Homework help")).not.toBeInTheDocument()
    await openHistory()
    await waitFor(() => expect(screen.getByText("Homework help")).toBeInTheDocument())
  })

  test("delete removes a conversation after confirmation", async () => {
    const user = userEvent.setup()
    mockFetch({ conversations: [{ id: "c1", title: "Homework help", updatedAt: null }] })

    renderPanel()
    await openHistory()
    await waitFor(() => {
      expect(screen.getByText("Homework help")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Delete Homework help" }))
    expect(screen.getByText("Delete this conversation?")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => {
      expect(mocks.deleteChat).toHaveBeenCalledWith({
        orgSlug: "acme",
        conversationId: "c1",
      })
    })
    await waitFor(() => {
      expect(screen.queryByText("Homework help")).not.toBeInTheDocument()
    })
  })

  test("expand deep-links to the active conversation page", async () => {
    const user = userEvent.setup()
    mockFetch({ conversations: [{ id: "c1", title: "Homework help", updatedAt: null }] })

    renderPanel()
    await openHistory()
    await user.click(await screen.findByText("Homework help"))
    const expand = await screen.findByRole("link", { name: "Open chat in full page" })
    expect(expand).toHaveAttribute("href", "/acme/chat/c1")
  })

  test("replaces a stale conversation when its message history is missing", async () => {
    const user = userEvent.setup()
    mocks.createEmptyChat
      .mockResolvedValueOnce({ success: true, conversationId: "initial-1" })
      .mockResolvedValueOnce({ success: true, conversationId: "recovered-1" })
    mockFetch({
      conversations: [{ id: "stale-1", title: "Old thread", updatedAt: null }],
      missingConversationId: "stale-1",
    })

    renderPanel()
    await waitFor(() => expect(mocks.createEmptyChat).toHaveBeenCalledTimes(1))
    await openHistory()
    await user.click(await screen.findByText("Old thread"))

    await waitFor(() => expect(mocks.createEmptyChat).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      expect(mocks.transport).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ conversationId: "recovered-1" }),
        }),
      )
    })
  })

  test("class seed shows context chip, resolves the default conversation, and start fresh resets", async () => {
    const user = userEvent.setup()
    mockFetch({
      conversations: [
        { id: "cls-conv-1", title: "Earlier questions", updatedAt: null },
      ],
    })

    renderPanel()
    await user.click(screen.getByRole("button", { name: "seed class" }))

    expect(screen.getByText("Biology 101")).toBeInTheDocument()
    expect(screen.getByText("Asking about class")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Ask about this class" }))
    await waitFor(() => {
      expect(mocks.resolveClassConversationAction).toHaveBeenCalledWith({
        orgSlug: "acme",
        classId: "cls-1",
      })
    })
    await waitFor(() => {
      expect(mocks.transport).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            conversationId: "cls-conv-1",
            surface: "class",
            entityId: "cls-1",
          }),
        }),
      )
    })

    await user.click(screen.getByRole("button", { name: "Start fresh" }))
    await waitFor(() => {
      expect(mocks.resetClassConversationAction).toHaveBeenCalledWith({
        orgSlug: "acme",
        classId: "cls-1",
      })
    })
  })

  test("admin can toggle the knowledge base manager", async () => {
    const user = userEvent.setup()
    mockFetch()
    renderPanel("admin")

    fireEvent.click(screen.getByRole("button", { name: "View conversation history" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "View conversation history" })).toHaveAttribute("data-state", "open"))
    await user.click(screen.getByRole("button", { name: "Manage knowledge base" }))
    expect(screen.getByTestId("org-memory-manager")).toBeInTheDocument()
  })

  test("escape closes the panel and removes the scrim", async () => {
    const user = userEvent.setup()
    mockFetch()
    renderPanel()

    expect(
      screen.getByRole("button", { name: "Close assistant panel overlay" }),
    ).toBeInTheDocument()

    await user.keyboard("{Escape}")
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Close assistant panel overlay" }),
      ).not.toBeInTheDocument()
    })
  })

  test("unauthenticated role hides the knowledge base entry", async () => {
    const user = userEvent.setup()
    mockFetch()
    renderPanel("member")
    await user.click(screen.getByRole("button", { name: "View conversation history" }))
    expect(
      screen.queryByRole("button", { name: "Manage knowledge base" }),
    ).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: "Escape" })
  })
})
