import { useUnreadStore } from "@/stores/unread-store"

describe("unread store", () => {
  beforeEach(() => {
    useUnreadStore.setState({ notificationUnread: 0 })
  })

  it("starts with zero unread notifications", () => {
    expect(useUnreadStore.getState().notificationUnread).toBe(0)
  })

  it("sets the live unread count from realtime events", () => {
    useUnreadStore.getState().setNotificationUnread(3)
    expect(useUnreadStore.getState().notificationUnread).toBe(3)
  })

  it("clears the badge without touching other state", () => {
    useUnreadStore.getState().setNotificationUnread(5)
    useUnreadStore.getState().clearUnread()
    expect(useUnreadStore.getState().notificationUnread).toBe(0)
  })
})