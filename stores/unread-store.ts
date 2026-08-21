import { create } from "zustand"

/**
 * Live unread-notification badge count shared across the app shell.
 *
 * The count is derived from server data but is continuously updated by
 * Supabase realtime events and rendered in the sidebar on every page, so it
 * lives as client state here. The notifications list itself stays server-
 * driven; the count is re-synced from the server on each page load.
 */
type UnreadState = {
  notificationUnread: number
  setNotificationUnread: (count: number) => void
  clearUnread: () => void
}

export const useUnreadStore = create<UnreadState>((set) => ({
  notificationUnread: 0,
  setNotificationUnread: (count) => set({ notificationUnread: count }),
  clearUnread: () => set({ notificationUnread: 0 }),
}))