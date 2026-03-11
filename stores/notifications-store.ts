import { create } from "zustand"

type NotificationData = {
  id: string
  type: "announcement" | "classwork"
  title: string
  message: string
  classId: string | null
  relatedId: string | null
  read: boolean
  createdAt: string
  className: string | null
}

type NotificationsState = {
  notifications: NotificationData[]
  unreadCount: number
  userId: string | null
  setNotifications: (notifications: NotificationData[]) => void
  setUserId: (userId: string | null) => void
  addNotification: (notification: NotificationData) => void
  updateNotification: (notificationId: string, updates: Partial<NotificationData>) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  updateUnreadCount: (count: number) => void
  clearNotifications: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  userId: null,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
  setUserId: (userId) => set({ userId }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
    })),
  updateNotification: (notificationId, updates) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, ...updates } : n,
      )
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    }),
  markAsRead: (notificationId) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      )
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  updateUnreadCount: (count) => set({ unreadCount: count }),
  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
      userId: null,
    }),
}))
