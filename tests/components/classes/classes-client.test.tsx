import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ClassesClient } from "@/components/classes/classes-client"
import { ToastProvider } from "@/components/ui/toast"
import type { ClassCardData } from "@/types/classes"

const mocks = vi.hoisted(() => ({
  createClass: vi.fn(),
  joinClass: vi.fn(),
  executeWithOfflineHandling: vi.fn(),
  listOfflineActions: vi.fn(),
  subscribeToOfflineQueue: vi.fn(),
}))

vi.mock("@/app/actions/classes", () => ({
  createClass: mocks.createClass,
  joinClass: mocks.joinClass,
}))

vi.mock("@/lib/offline-action-handler", () => ({
  executeWithOfflineHandling: mocks.executeWithOfflineHandling,
}))

vi.mock("@/lib/offline-queue", () => ({
  listOfflineActions: mocks.listOfflineActions,
  subscribeToOfflineQueue: mocks.subscribeToOfflineQueue,
}))

vi.mock("@/hooks/classes/use-classes-data", () => ({
  useClassesData: ({ teachingClasses, enrolledClasses }: { teachingClasses: ClassCardData[]; enrolledClasses: ClassCardData[] }) => ({
    filteredClasses: [...teachingClasses, ...enrolledClasses],
    prefetchOnHover: vi.fn(),
    cancelPrefetch: vi.fn(),
  }),
}))

describe("ClassesClient", () => {
  beforeEach(() => {
    mocks.subscribeToOfflineQueue.mockImplementation(() => () => {})
    mocks.listOfflineActions.mockResolvedValue([])
  })

  it("keeps class actions in the page and shows one combined collection", () => {
    renderClassesClient()

    const pageHeading = screen.getByRole("heading", { level: 1, name: "Classes" })
    const headingRegion = pageHeading.closest('[data-slot="page-heading"]')

    expect(headingRegion).toContainElement(screen.getByRole("button", { name: "Join class" }))
    expect(headingRegion).toContainElement(screen.getByRole("button", { name: "Create class" }))
    expect(screen.getByRole("button", { name: "Join class" })).toHaveAttribute("data-variant", "secondary")
    expect(screen.getByRole("button", { name: "Create class" })).toHaveAttribute("data-variant", "default")
    expect(headingRegion).not.toHaveClass("border-b")
    const filters = screen.getByRole("search", { name: "Class filters" })
    expect(filters).not.toHaveClass("bg-primary-border/50", "border-b")
    expect(screen.getByRole("searchbox", { name: "Search classes" })).toHaveClass("border-0")
    expect(screen.getByRole("list", { name: "Classes" })).toBeInTheDocument()
    expect(screen.getByText("Interface Design")).toBeInTheDocument()
    expect(screen.getByText("Computer Science")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Teaching" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Enrolled" })).not.toBeInTheDocument()
    expect(screen.getByRole("search", { name: "Class filters" })).toHaveTextContent("2 classes")
  })

  it("provides clearable search and explicit sorting", async () => {
    const user = userEvent.setup()
    renderClassesClient()

    const search = screen.getByRole("searchbox", { name: "Search classes" })
    await user.type(search, "science")
    expect(search).toHaveValue("science")
    await user.click(screen.getByRole("button", { name: "Clear search" }))
    expect(search).toHaveValue("")

    const sort = screen.getByRole("combobox", { name: "Sort classes" })
    expect(sort).toHaveTextContent("Newest first")
    sort.focus()
    await user.keyboard("{Enter}{ArrowDown}{Enter}")
    expect(sort).toHaveTextContent("Oldest first")
  })
})

describe("ClassesClient streaming", () => {
  it("renders the header and search controls instantly and streams the grid", async () => {
    let resolvePromise: (data: {
      teachingClasses: ClassCardData[]
      enrolledClasses: ClassCardData[]
    }) => void = () => {}
    const classesPromise = new Promise<{
      teachingClasses: ClassCardData[]
      enrolledClasses: ClassCardData[]
    }>((resolve) => {
      resolvePromise = resolve
    })

    let container: HTMLElement | undefined
    await act(async () => {
      container = render(
        <ToastProvider>
          <ClassesClient
            classesPromise={classesPromise}
            isAuthenticated
            canCreateClass
            orgSlug="academy"
          />
        </ToastProvider>,
      ).container
    })

    // The static shell paints immediately: real title, actions, and controls.
    expect(screen.getByRole("heading", { level: 1, name: "Classes" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Join class" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create class" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Search classes" })).toBeInTheDocument()

    // The grid region shows its skeleton while the promise is pending.
    expect(container!.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)

    await act(async () => {
      resolvePromise({
        teachingClasses: [createClass("teaching-1", "Interface Design", "teaching")],
        enrolledClasses: [],
      })
    })

    expect(await screen.findByRole("list", { name: "Classes" })).toBeInTheDocument()
    expect(screen.getByText("Interface Design")).toBeInTheDocument()
    expect(screen.getByRole("search", { name: "Class filters" })).toHaveTextContent("1 class")
  })
})

describe("ClassesClient offline queued creation", () => {
  beforeEach(() => {
    mocks.subscribeToOfflineQueue.mockImplementation(() => () => {})
    mocks.listOfflineActions.mockResolvedValue([])
  })

  async function createClassOffline(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Create class" }))
    await user.type(screen.getByLabelText("Subject or class name"), "Physics 101")
    const dialog = screen.getByRole("dialog")
    const gradeTrigger = within(dialog).getByRole("combobox")
    gradeTrigger.focus()
    await user.keyboard("{Enter}")
    await screen.findByRole("listbox")
    await user.click(await screen.findByRole("option", { name: "Grade 1" }))
    await user.click(within(dialog).getByRole("button", { name: "Create class" }))
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      },
      { timeout: 10_000 },
    )
    return dialog
  }

  it("keeps a created class pending while offline and clears it once the queue syncs", async () => {
    const user = userEvent.setup()
    let reconcile: (() => Promise<void>) | null = null
    mocks.subscribeToOfflineQueue.mockImplementation(
      (listener: () => Promise<void>) => {
        reconcile = listener
        return () => {}
      },
    )
    mocks.executeWithOfflineHandling.mockResolvedValue({ success: true, queued: true })

    renderClassesClient()

    await createClassOffline(user)

    // Offline: no server action ran; the optimistic card stays pending.
    expect(mocks.executeWithOfflineHandling).toHaveBeenCalledOnce()
    expect(mocks.createClass).not.toHaveBeenCalled()
    expect(screen.getByText("Physics 101")).toBeInTheDocument()
    expect(screen.getByText("Creating…")).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    // The queue syncs (the queued action is gone), so the placeholder clears.
    await act(async () => {
      await reconcile?.()
    })

    expect(screen.queryByText("Physics 101")).not.toBeInTheDocument()
  }, 15_000)

  it("removes a pending class and shows a toast when the queued creation fails", async () => {
    const user = userEvent.setup()
    let reconcile: (() => Promise<void>) | null = null
    let tempId: string | undefined
    mocks.subscribeToOfflineQueue.mockImplementation(
      (listener: () => Promise<void>) => {
        reconcile = listener
        return () => {}
      },
    )
    mocks.executeWithOfflineHandling.mockImplementation(
      async (_action: () => Promise<unknown>, _type: string, payload: unknown) => {
        tempId = (payload as { tempId?: string }).tempId
        return { success: true, queued: true }
      },
    )
    renderClassesClient()

    await createClassOffline(user)
    expect(screen.getByText("Physics 101")).toBeInTheDocument()

    mocks.listOfflineActions.mockResolvedValue([
      { status: "failed", lastError: "Network unreachable", payload: { tempId } },
    ])

    await act(async () => {
      await reconcile?.()
    })

    expect(screen.queryByText("Physics 101")).not.toBeInTheDocument()
    expect(screen.getByText("Couldn't save changes")).toBeInTheDocument()
    expect(screen.getByText("Network unreachable")).toBeInTheDocument()
  }, 15_000)
})

function renderClassesClient() {
  return render(
    <ToastProvider>
      <ClassesClient
        teachingClasses={[createClass("teaching-1", "Interface Design", "teaching")]}
        enrolledClasses={[createClass("enrolled-1", "Computer Science", "enrolled")]}
        isAuthenticated
        canCreateClass
        orgSlug="academy"
      />
    </ToastProvider>,
  )
}

function createClass(id: string, title: string, role: "teaching" | "enrolled"): ClassCardData {
  return {
    id,
    title,
    description: null,
    gradeLevel: "grade_10",
    customGrade: null,
    section: null,
    category: "Course",
    color: null,
    schedule: null,
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
    enrolledCount: 10,
    role,
    teacherName: "Ada Lovelace",
    teacherImage: null,
  }
}
