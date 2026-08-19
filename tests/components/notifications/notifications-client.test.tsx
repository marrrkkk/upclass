import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  NotificationsClient,
  type NotificationData,
} from "@/components/notifications/notifications-client"

const notificationActions = vi.hoisted(() => ({
  markAll: vi.fn(),
  markOne: vi.fn(),
}))

vi.mock("@/app/actions/notifications", () => ({
  markAllNotificationsAsRead: notificationActions.markAll,
  markNotificationAsRead: notificationActions.markOne,
}))

vi.mock("@/hooks/use-organization-path", () => ({
  useOrganizationPath: () => (path: string) => `/academy${path}`,
}))

vi.mock("@/lib/cache-hooks", () => ({
  useCacheData: vi.fn(),
  useOfflineCollectionCache: vi.fn(),
}))

vi.mock("@/lib/background-cache", () => ({
  BackgroundCache: {
    getInstance: () => ({
      getCachedNotifications: vi.fn().mockResolvedValue([]),
    }),
  },
}))

vi.mock("@/lib/supabase-client", () => ({
  supabase: null,
}))

const notifications: NotificationData[] = [
  {
    id: "notification-new",
    type: "classwork",
    title: "New assignment posted",
    message: "Read chapter four before Friday.",
    classId: "class-1",
    relatedId: "assignment-1",
    read: false,
    createdAt: "2026-03-02T12:00:00.000Z",
    className: "Software Architecture",
  },
  {
    id: "notification-old",
    type: "announcement",
    title: "Room change",
    message: "Tomorrow's lecture is in room 204.",
    classId: "class-2",
    relatedId: "announcement-1",
    read: true,
    createdAt: "2026-03-01T12:00:00.000Z",
    className: "Research Methods",
  },
]

describe("NotificationsClient", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    })
    notificationActions.markOne.mockResolvedValue(undefined)
    notificationActions.markAll.mockResolvedValue(undefined)
  })

  it("keeps notification order and tenant-aware class targets", async () => {
    render(
      <NotificationsClient
        notifications={notifications}
        userId="user-1"
        showHeader={false}
      />,
    )

    const list = await screen.findByRole("list", { name: "Notifications" })
    const rows = within(list).getAllByRole("listitem")

    expect(within(rows[0]).getByText("New assignment posted")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Room change")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "New assignment posted" })).toHaveAttribute(
      "href",
      "/academy/classes/class-1#classwork",
    )
    expect(screen.getByRole("link", { name: "Room change" })).toHaveAttribute(
      "href",
      "/academy/classes/class-2#stream",
    )
    expect(within(rows[0]).getByText("Unread")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Read")).toBeInTheDocument()
  })

  it("marks one unread notification only after its action succeeds", async () => {
    const user = userEvent.setup()

    render(
      <NotificationsClient
        notifications={notifications}
        userId="user-1"
        showHeader={false}
      />,
    )

    await user.click(
      await screen.findByRole("button", { name: "Mark New assignment posted as read" }),
    )

    expect(notificationActions.markOne).toHaveBeenCalledWith("notification-new")
    await waitFor(() => {
      expect(screen.getAllByText("Read")).toHaveLength(2)
    })
  })

  it("marks every unread notification as read", async () => {
    const user = userEvent.setup()
    const allUnread = notifications.map((notification) => ({
      ...notification,
      read: false,
    }))

    render(
      <NotificationsClient
        notifications={allUnread}
        userId="user-1"
        showHeader={false}
      />,
    )

    await user.click(await screen.findByRole("button", { name: "Mark all read" }))

    expect(notificationActions.markAll).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getAllByText("Read")).toHaveLength(2)
    })
    expect(screen.queryByRole("button", { name: "Mark all read" })).not.toBeInTheDocument()
  })

  it("shows the shared empty state when there are no notifications", async () => {
    render(
      <NotificationsClient
        notifications={[]}
        userId="user-1"
        showHeader={false}
      />,
    )

    expect(await screen.findByText("All caught up")).toBeInTheDocument()
    expect(screen.getByText(/new class updates will appear here/i)).toBeInTheDocument()
  })
})
