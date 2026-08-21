import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"

import { ToastProvider } from "@/components/ui/toast"
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation"

const mocks = vi.hoisted(() => ({
  executeWithOfflineHandling: vi.fn(),
  listOfflineActions: vi.fn(),
  subscribeToOfflineQueue: vi.fn(),
}))

vi.mock("@/lib/offline-action-handler", () => ({
  executeWithOfflineHandling: mocks.executeWithOfflineHandling,
}))

vi.mock("@/lib/offline-queue", () => ({
  listOfflineActions: mocks.listOfflineActions,
  subscribeToOfflineQueue: mocks.subscribeToOfflineQueue,
}))

type Item = { id: string; tempId?: string; pending?: boolean }

function Harness({ action }: { action: () => Promise<{ success: boolean; classId?: string; error?: string; queued?: boolean }> }) {
  const [items, setItems] = useState<Item[]>([])
  const { mutate, pending } = useOptimisticMutation(items, setItems)

  const add = () =>
    void mutate(
      (previous) => [{ id: "temp-1", tempId: "temp-1", pending: true }, ...previous],
      action,
      {
        queued: {
          tempId: "temp-1",
          remove: (current) => current.filter((item) => item.tempId !== "temp-1"),
        },
        onSuccess: (result, current) => {
          const classId = result.classId
          return classId
            ? current.map((item) =>
                item.tempId === "temp-1" ? { ...item, id: classId, tempId: classId, pending: false } : item,
              )
            : current.filter((item) => item.tempId !== "temp-1")
        },
        onError: (_message, current) => current.filter((item) => item.tempId !== "temp-1"),
      },
    )

  return (
    <div>
      <button type="button" onClick={add}>
        Add
      </button>
      <span>pending:{String(pending)}</span>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.id}:{String(item.pending ?? false)}
          </li>
        ))}
      </ul>
    </div>
  )
}

describe("useOptimisticMutation", () => {
  beforeEach(() => {
    mocks.executeWithOfflineHandling.mockReset()
    mocks.listOfflineActions.mockReset()
    mocks.subscribeToOfflineQueue.mockReset().mockReturnValue(() => {})
  })

  it("applies the optimistic state synchronously and reconciles on success", async () => {
    let resolveAction!: (value: { success: boolean; classId?: string }) => void
    const action = () =>
      new Promise<{ success: boolean; classId?: string }>((resolve) => {
        resolveAction = resolve
      })
    render(
      <ToastProvider>
        <Harness action={action} />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Add" }))

    expect(screen.getByText("temp-1:true")).toBeInTheDocument()

    await act(async () => {
      resolveAction({ success: true, classId: "real-1" })
    })

    expect(await screen.findByText("real-1:false")).toBeInTheDocument()
    expect(screen.queryByText("temp-1:true")).not.toBeInTheDocument()
  })

  it("rolls back to the previous state and toasts on failure", async () => {
    let resolveAction!: (value: { success: boolean; error?: string }) => void
    const action = () =>
      new Promise<{ success: boolean; error?: string }>((resolve) => {
        resolveAction = resolve
      })
    render(
      <ToastProvider>
        <Harness action={action} />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Add" }))

    expect(screen.getByText("temp-1:true")).toBeInTheDocument()

    await act(async () => {
      resolveAction({ success: false, error: "Server rejected the class" })
    })

    const toast = await screen.findByRole("status")
    expect(toast).toHaveAttribute("data-tone", "danger")
    expect(screen.getByText("Couldn't save changes")).toBeInTheDocument()
    expect(screen.getByText("Server rejected the class")).toBeInTheDocument()

    expect(screen.queryByText("temp-1:true")).not.toBeInTheDocument()
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
  })

  it("keeps the optimistic entity while queued and removes it once the queue entry syncs", async () => {
    mocks.executeWithOfflineHandling.mockResolvedValue({ success: true, queued: true })
    let listener: () => void = () => {}
    mocks.subscribeToOfflineQueue.mockImplementation((cb: () => void) => {
      listener = cb
      return () => {}
    })
    mocks.listOfflineActions.mockResolvedValue([
      { id: "entry-1", type: "create-class", status: "pending", payload: { tempId: "temp-1" } },
    ])

    const action = vi.fn().mockResolvedValue({ success: true, queued: true })
    render(
      <ToastProvider>
        <Harness action={action} />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Add" }))

    // Let the transition finish registering the queued temp ID before we fire
    // the queue listener.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByText("temp-1:true")).toBeInTheDocument()

    // The queue entry is gone: the action synced successfully, so the optimistic
    // placeholder is dropped and the server refresh reconciles the real data.
    mocks.listOfflineActions.mockResolvedValue([])
    await act(async () => {
      await listener()
    })

    expect(screen.queryByText("temp-1:true")).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("removes the optimistic entity and toasts when the queue reports a terminal failure", async () => {
    mocks.executeWithOfflineHandling.mockResolvedValue({ success: true, queued: true })
    let listener: () => void = () => {}
    mocks.subscribeToOfflineQueue.mockImplementation((cb: () => void) => {
      listener = cb
      return () => {}
    })
    mocks.listOfflineActions.mockResolvedValue([
      {
        id: "entry-1",
        type: "create-class",
        status: "failed",
        lastError: "This action could not be synced.",
        payload: { tempId: "temp-1" },
      },
    ])

    const action = vi.fn().mockResolvedValue({ success: true, queued: true })
    render(
      <ToastProvider>
        <Harness action={action} />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Add" }))

    // Let the transition finish registering the queued temp ID before we fire
    // the queue listener.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByText("temp-1:true")).toBeInTheDocument()

    await act(async () => {
      await listener()
    })

    expect(screen.queryByText("temp-1:true")).not.toBeInTheDocument()
    const toast = screen.getByRole("status")
    expect(toast).toHaveAttribute("data-tone", "danger")
    expect(screen.getByText("Couldn't save changes")).toBeInTheDocument()
  })
})