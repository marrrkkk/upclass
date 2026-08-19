import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { MessagesClient } from "@/components/messages/messages-client"

const searchMessages = vi.hoisted(() => vi.fn())

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockNewConversationDialog() {
      return <button type="button">New conversation</button>
    },
}))

vi.mock("@/app/actions/messages", () => ({
  searchMessages,
}))

vi.mock("@/lib/supabase-client", () => ({
  supabase: null,
}))

const directThread = {
  kind: "direct" as const,
  id: "direct-user-2",
  userId: "user-2",
  title: "Ada Lovelace",
  userName: "Ada Lovelace",
  userImage: null,
  lastMessage: "Can you review the notes?",
  lastMessageTime: "2025-03-01T12:00:00.000Z",
  unreadCount: 2,
  href: "/academy/messages/user-2",
}

const channelThread = {
  kind: "channel" as const,
  id: "channel-class-1",
  channelId: "channel-1",
  classId: "class-1",
  title: "Literature · General",
  className: "Literature",
  classColor: "course-blue",
  channelName: "General",
  lastMessage: "The reading guide is posted.",
  lastMessageTime: "2025-03-02T12:00:00.000Z",
  unreadCount: 0,
  href: "/academy/messages/class/class-1",
}

describe("MessagesClient", () => {
  beforeEach(() => {
    searchMessages.mockReset()
  })

  it("renders a semantic tenant-aware thread list inside a split view", () => {
    const { container } = render(
      <MessagesClient
        threads={[directThread, channelThread]}
        channels={[channelThread]}
        userId="user-1"
        orgSlug="academy"
        showHeader={false}
      />,
    )

    expect(container.querySelector('[data-slot="responsive-split-view"]')).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Conversations" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Conversation detail" })).toBeInTheDocument()
    expect(screen.getByText("Select a conversation")).toBeInTheDocument()

    const list = screen.getByRole("list", { name: "Message threads" })
    expect(within(list).getAllByRole("listitem")).toHaveLength(2)
    expect(within(list).getByRole("link", { name: /Ada Lovelace/i })).toHaveAttribute(
      "href",
      "/academy/messages/user-2",
    )
    expect(within(list).getByRole("link", { name: /Literature/i })).toHaveAttribute(
      "href",
      "/academy/messages/class/class-1",
    )
    expect(screen.getByLabelText("2 unread messages")).toBeInTheDocument()
  })

  it("keeps search scoped to the tenant and renders tenant-aware results", async () => {
    searchMessages.mockResolvedValue({
      success: true,
      results: [
        {
          id: "result-1",
          title: "Ada Lovelace",
          subtitle: "Direct message",
          snippet: "Syllabus notes",
          href: "/academy/messages/user-2",
          createdAt: "2025-03-01T12:00:00.000Z",
        },
      ],
    })

    render(
      <MessagesClient
        threads={[directThread]}
        channels={[]}
        userId="user-1"
        orgSlug="academy"
        showHeader={false}
      />,
    )

    fireEvent.change(screen.getByRole("searchbox", { name: "Search messages" }), {
      target: { value: "syllabus" },
    })

    await waitFor(() => {
      expect(searchMessages).toHaveBeenCalledWith("syllabus", "academy")
    })

    expect(
      await screen.findByRole("link", { name: /Ada Lovelace/i }),
    ).toHaveAttribute("href", "/academy/messages/user-2")
  })
})
