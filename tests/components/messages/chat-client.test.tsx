import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { ChatClient } from "@/components/messages/chat-client"

const mocks = vi.hoisted(() => ({
  markConversationAsRead: vi.fn(),
  sendMessage: vi.fn(),
  setPageTitle: vi.fn(),
  startUpload: vi.fn(),
}))

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockImageViewerDialog({ images }: { images: string[] }) {
      return (
        <div role="dialog" aria-label="Image viewer">
          {images.join(",")}
        </div>
      )
    },
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/academy/messages/user-2",
}))

vi.mock("@/app/actions/messages", () => ({
  markConversationAsRead: mocks.markConversationAsRead,
  sendMessage: mocks.sendMessage,
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

vi.mock("@/lib/cache-hooks", () => ({
  useCacheData: vi.fn(),
  useOfflineCollectionCache: vi.fn(),
}))

vi.mock("@/lib/background-cache", () => ({
  BackgroundCache: {
    getInstance: vi.fn(),
  },
}))

vi.mock("@/lib/offline-action-handler", () => ({
  executeWithOfflineHandling: vi.fn(),
}))

vi.mock("@/stores/page-header-store", () => ({
  usePageHeaderStore: (
    selector: (state: { setPageTitle: typeof mocks.setPageTitle }) => unknown,
  ) => selector({ setPageTitle: mocks.setPageTitle }),
}))

describe("ChatClient", () => {
  beforeEach(() => {
    mocks.markConversationAsRead.mockReset()
    mocks.setPageTitle.mockReset()
  })

  it("keeps tenant navigation, presence, attachments, and pending delivery visible", async () => {
    const createdAt = new Date().toISOString()

    render(
      <ChatClient
        currentUserId="user-1"
        otherUser={{
          id: "user-2",
          name: "Ada Lovelace",
          image: null,
          email: "ada@example.com",
        }}
        messages={[
          {
            id: "message-1",
            senderId: "user-2",
            receiverId: "user-1",
            content: "Please review https://example.com/notes",
            media: [
              {
                url: "https://cdn.example.com/lab.png",
                type: "image/png",
                name: "Lab diagram",
              },
              {
                url: "https://cdn.example.com/worksheet.pdf",
                type: "application/pdf",
                name: "Worksheet.pdf",
              },
            ],
            url: null,
            read: true,
            createdAt,
          },
          {
            id: "temp-queued-1",
            senderId: "user-1",
            receiverId: "user-2",
            content: "My reply",
            media: null,
            url: null,
            read: false,
            createdAt,
          },
          {
            id: "temp-queued-2",
            senderId: "user-1",
            receiverId: "user-2",
            content: "One more thought",
            media: null,
            url: null,
            read: false,
            createdAt,
          },
        ]}
      />,
    )

    expect(screen.getByRole("link", { name: "Back to messages" })).toHaveAttribute(
      "href",
      "/academy/messages",
    )
    expect(screen.getByRole("log", { name: "Conversation with Ada Lovelace" })).toBeInTheDocument()

    expect(await screen.findByText("Active now")).toBeInTheDocument()
    const imageButton = await screen.findByRole("button", { name: "View Lab diagram" })
    expect(imageButton).toBeInTheDocument()
    fireEvent.click(imageButton)
    expect(screen.getByRole("dialog", { name: "Image viewer" })).toHaveTextContent(
      "https://cdn.example.com/lab.png",
    )
    expect(screen.getByRole("link", { name: "Worksheet.pdf" })).toHaveAttribute(
      "href",
      "https://cdn.example.com/worksheet.pdf",
    )
    expect(screen.getByRole("link", { name: /https:\/\/example\.com\/notes/i })).toBeInTheDocument()
    expect(screen.getAllByText("Pending delivery")).toHaveLength(2)

    await waitFor(() => {
      expect(mocks.markConversationAsRead).toHaveBeenCalledWith("user-2")
    })
  })
})
