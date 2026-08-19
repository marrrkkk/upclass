import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { ClassChannelChatClient } from "@/components/messages/class-channel-chat-client"

const mocks = vi.hoisted(() => ({
  executeWithOfflineHandling: vi.fn(),
  markChannelAsRead: vi.fn(),
  refresh: vi.fn(),
  sendChannelMessage: vi.fn(),
  startUpload: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/academy/messages/class/class-1",
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}))

vi.mock("@/app/actions/messages", () => ({
  markChannelAsRead: mocks.markChannelAsRead,
  sendChannelMessage: mocks.sendChannelMessage,
}))

vi.mock("@/lib/supabase-client", () => ({
  supabase: null,
}))

vi.mock("@/lib/supabase-storage", () => ({
  useSupabaseUpload: () => ({
    startUpload: mocks.startUpload,
    isUploading: false,
  }),
}))

vi.mock("@/lib/offline-action-handler", () => ({
  executeWithOfflineHandling: mocks.executeWithOfflineHandling,
}))

describe("ClassChannelChatClient", () => {
  beforeEach(() => {
    mocks.markChannelAsRead.mockReset()
    mocks.refresh.mockReset()
    mocks.sendChannelMessage.mockReset()
    mocks.sendChannelMessage.mockResolvedValue({ success: true })
    mocks.startUpload.mockReset()
    mocks.executeWithOfflineHandling.mockReset()
    mocks.executeWithOfflineHandling.mockResolvedValue({
      success: false,
      queued: true,
      error: "Message queued until you are online",
    })
  })

  it("shows channel attachments and queued send feedback without losing tenant context", async () => {
    render(
      <ClassChannelChatClient
        channelId="channel-1"
        className="Literature"
        classColor="course-blue"
        currentUserId="user-1"
        messages={[
          {
            id: "message-1",
            senderId: "user-2",
            content: "The reading guide is ready.",
            media: [
              {
                url: "https://cdn.example.com/reading-guide.pdf",
                type: "application/pdf",
                name: "Reading guide.pdf",
              },
            ],
            createdAt: "2025-03-01T12:00:00.000Z",
            sender: {
              id: "user-2",
              name: "Ada Lovelace",
              image: null,
            },
          },
        ]}
      />,
    )

    expect(screen.getByRole("link", { name: "Back to messages" })).toHaveAttribute(
      "href",
      "/academy/messages",
    )
    expect(screen.getByRole("log", { name: "Literature general channel" })).toBeInTheDocument()
    expect(screen.getByText("General channel")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Reading guide.pdf" })).toHaveAttribute(
      "href",
      "https://cdn.example.com/reading-guide.pdf",
    )

    const composer = screen.getByRole("textbox", { name: "Message Literature" })
    fireEvent.change(composer, { target: { value: "Offline class update" } })
    fireEvent.click(screen.getByRole("button", { name: "Send channel message" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Message queued until you are online",
    )
    await waitFor(() => {
      expect(composer).toHaveValue("")
      expect(mocks.executeWithOfflineHandling).toHaveBeenCalledWith(
        expect.any(Function),
        "send-channel-message",
        {
          orgSlug: "academy",
          channelId: "channel-1",
          content: "Offline class update",
          media: undefined,
          clientMessageId: expect.any(String),
        },
      )
    })
    expect(mocks.sendChannelMessage).not.toHaveBeenCalled()

    const attachmentInput = screen.getByLabelText("Attach files")
    fireEvent.change(attachmentInput, {
      target: { files: [new File(["notes"], "seminar-notes.txt", { type: "text/plain" })] },
    })

    const selectedAttachments = screen.getByRole("list", {
      name: "Selected attachments",
    })
    expect(within(selectedAttachments).getByText("seminar-notes.txt")).toBeInTheDocument()
    expect(
      within(selectedAttachments).getByRole("button", { name: "Remove seminar-notes.txt" }),
    ).toBeInTheDocument()
    expect(mocks.markChannelAsRead).toHaveBeenCalledWith("channel-1")
  })
})
