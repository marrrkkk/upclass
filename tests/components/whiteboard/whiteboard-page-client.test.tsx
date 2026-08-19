import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"

import { WhiteboardPageClient } from "@/whiteboard/components/whiteboard-page-client"
import { useWhiteboardUiStore } from "@/whiteboard/state/use-whiteboard-ui-store"
import type { WhiteboardPageData } from "@/whiteboard/types"

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}))

vi.mock("next/dynamic", () => ({
  default: () => function MockExcalidrawBoard({ boardId }: { boardId: string }) {
    return <div data-testid="excalidraw-board" data-board-id={boardId} />
  },
}))

vi.mock("@/components/offline-route-guard", () => ({
  OfflineRouteGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/hooks/use-organization-path", () => ({
  useOrganizationPath: () => (path: string) => `/academy${path}`,
}))

vi.mock("@/whiteboard/persistence/query-client-provider", () => ({
  WhiteboardQueryClientProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/whiteboard/persistence/use-whiteboard-queries", () => ({
  WhiteboardConflictError: class WhiteboardConflictError extends Error {},
  useSaveWhiteboardSnapshot: () => ({
    mutateAsync: mocks.mutateAsync,
  }),
  useWhiteboardBoard: (_boardId: string, initialData: WhiteboardPageData) => ({
    data: initialData,
    isFetching: false,
    isLoading: false,
    refetch: mocks.refetch,
  }),
}))

const initialData: WhiteboardPageData = {
  board: {
    id: "board-1",
    classId: "class-1",
    title: "Physics whiteboard",
    ownerId: "teacher-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  snapshot: {
    id: "snapshot-1",
    boardId: "board-1",
    version: 3,
    document: null,
    legacyData: "[]",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
}

describe("WhiteboardPageClient chrome", () => {
  beforeEach(() => {
    mocks.refetch.mockResolvedValue({ data: initialData })
    mocks.mutateAsync.mockResolvedValue({ snapshot: { version: 4 } })
    useWhiteboardUiStore.setState({
      activeTool: "select",
      isUploading: false,
      saveStatus: "saved",
    })
  })

  it("shows truthful status and keeps navigation inside the organization", () => {
    render(
      <WhiteboardPageClient
        className="Physics"
        currentUser={{ id: "teacher-1", name: "Ada Lovelace", image: null }}
        initialData={initialData}
      />,
    )

    expect(screen.getByRole("heading", { name: "Physics whiteboard", level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to Physics" })).toHaveAttribute(
      "href",
      "/academy/classes/class-1",
    )
    expect(screen.getByText("Saved")).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Only you are here" })).toBeInTheDocument()
    expect(screen.getByTestId("excalidraw-board")).toHaveAttribute("data-board-id", "board-1")
  })

  it("announces image uploads through the existing UI store", () => {
    useWhiteboardUiStore.setState({ isUploading: true })

    render(
      <WhiteboardPageClient
        className="Physics"
        currentUser={{ id: "teacher-1", name: "Ada Lovelace", image: null }}
        initialData={initialData}
      />,
    )

    expect(screen.getByText("Uploading image")).toBeInTheDocument()
  })
})
