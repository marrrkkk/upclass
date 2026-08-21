import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { NewConversationDialog } from "@/components/messages/new-conversation-dialog"

vi.mock("@/hooks/use-organization-path", () => ({
  useOrganizationPath: () => (path: string) => `/academy${path}`,
}))

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <NewConversationDialog currentUserId="user-1" />
    </QueryClientProvider>,
  )
}

describe("NewConversationDialog", () => {
  it("omits class channels and still starts a direct-message lookup", async () => {
    const actor = userEvent.setup()
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ userId: "user-2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchSpy)

    renderDialog()
    await actor.click(screen.getByRole("button", { name: "New conversation" }))

    expect(screen.queryByText("Class channels")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /general channel/i })).not.toBeInTheDocument()

    await actor.type(screen.getByRole("textbox", { name: "Email address" }), "ada@example.com")
    await actor.click(screen.getByRole("button", { name: /Start chat|Searching/i }))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/users/by-email?email=ada%40example.com",
      )
    })

    vi.unstubAllGlobals()
  })
})
