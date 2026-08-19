"use client"

import { useEffect, useMemo, useTransition, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import {
  BellOff,
  BookOpen,
  Check,
  CheckCheck,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"

import { markAllNotificationsAsRead, markNotificationAsRead } from "@/app/actions/notifications"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Panel,
  PanelActions,
  PanelDescription,
  PanelHeader,
  PanelHeading,
  PanelTitle,
} from "@/components/ui/panel"
import { PageHeading } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { TimelineRow } from "@/components/ui/timeline-row"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { BackgroundCache } from "@/lib/background-cache"
import { useCacheData, useOfflineCollectionCache } from "@/lib/cache-hooks"
import { type Tone } from "@/lib/design-system"
import { supabase } from "@/lib/supabase-client"
import { useUnreadStore } from "@/stores/unread-store"

export type NotificationData = {
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

type NotificationsClientProps = {
  notifications: NotificationData[]
  userId: string
  showHeader?: boolean
}

type NotificationPresentation = {
  Icon: LucideIcon
  tone: Tone
}

function getNotificationPresentation(type: NotificationData["type"]): NotificationPresentation {
  if (type === "announcement") {
    return { Icon: MessageSquare, tone: "info" }
  }

  return { Icon: BookOpen, tone: "warning" }
}

export function NotificationsClient({
  notifications: initialNotifications,
  userId,
  showHeader = true,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>(initialNotifications)
  const setNotificationUnread = useUnreadStore((state) => state.setNotificationUnread)
  const [pending, startTransition] = useTransition()
  const organizationPath = useOrganizationPath()

  useEffect(() => {
    const hasServerNotifications = initialNotifications.length > 0
    const isOffline = typeof window !== "undefined" && !navigator.onLine

    if (isOffline && !hasServerNotifications) return

    setNotifications(initialNotifications)
  }, [initialNotifications])

  useCacheData(notifications, "notifications", true)

  useOfflineCollectionCache<NotificationData>({
    onlineData: initialNotifications,
    getCachedData: () => BackgroundCache.getInstance().getCachedNotifications(),
    onHydrate: setNotifications,
  })

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  // Keep the sidebar badge in sync with this page's live list.
  useEffect(() => {
    setNotificationUnread(unreadCount)
  }, [setNotificationUnread, unreadCount])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`notifications-page:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as {
              id: string
              type: "announcement" | "classwork"
              title: string
              message: string
              class_id: string
              related_id: string
              read: boolean
              created_at: string
            }
            setNotifications((current) => [
              {
                id: newNotif.id,
                type: newNotif.type,
                title: newNotif.title,
                message: newNotif.message,
                classId: newNotif.class_id,
                relatedId: newNotif.related_id,
                read: newNotif.read,
                createdAt: newNotif.created_at,
                className: null,
              },
              ...current,
            ])
          } else if (payload.eventType === "UPDATE") {
            const updatedNotif = payload.new as { id: string; read: boolean }
            setNotifications((current) =>
              current.map((n) =>
                n.id === updatedNotif.id ? { ...n, read: updatedNotif.read } : n,
              ),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [userId])

  const handleMarkAsRead = (notificationId: string) => {
    startTransition(async () => {
      await markNotificationAsRead(notificationId)
      setNotifications((current) =>
        current.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      )
    })
  }

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead()
      setNotifications((current) => current.map((n) => ({ ...n, read: true })))
    })
  }

  const getNotificationLink = (notification: NotificationData) => {
    if (!notification.classId) return "#"

    const classPath = organizationPath(`/classes/${notification.classId}`)
    return `${classPath}${notification.type === "classwork" ? "#classwork" : "#stream"}`
  }

  const markAllAction = unreadCount > 0 ? (
    <Button
      onClick={handleMarkAllAsRead}
      disabled={pending}
      variant="outline"
      size="sm"
    >
      <CheckCheck aria-hidden="true" />
      Mark all read
    </Button>
  ) : null

  return (
    <div className="flex flex-col gap-6">
      {showHeader ? (
        <PageHeading
          eyebrow="Class updates"
          title="Notifications"
          description="Announcements and coursework updates from your classes."
          actions={markAllAction}
        />
      ) : null}

      <Panel padding="none" className="overflow-hidden">
        <PanelHeader>
          <PanelHeading>
            <PanelTitle>Notification timeline</PanelTitle>
            <PanelDescription>Newest updates appear first.</PanelDescription>
          </PanelHeading>
          <PanelActions>
            <StatusBadge tone={unreadCount > 0 ? "primary" : "neutral"} dot={unreadCount > 0}>
              <span className="numeric-tabular">{unreadCount}</span> unread
            </StatusBadge>
            {!showHeader ? markAllAction : null}
          </PanelActions>
        </PanelHeader>

        {notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff aria-hidden="true" />}
            title="All caught up"
            description="You have no notifications right now. New class updates will appear here."
          />
        ) : (
          <div role="list" aria-label="Notifications" className="divide-y divide-hairline">
            {notifications.map((notification) => {
              const { Icon, tone } = getNotificationPresentation(notification.type)
              const isUnread = !notification.read

              return (
                <TimelineRow
                  key={notification.id}
                  role="listitem"
                  className="relative row-interactive"
                  icon={<Icon aria-hidden="true" />}
                  tone={tone}
                  title={(
                    <Link
                      href={getNotificationLink(notification)}
                      onClick={() => {
                        if (isUnread) handleMarkAsRead(notification.id)
                      }}
                      className="focus-ring after:absolute after:inset-0 after:content-['']"
                    >
                      {notification.title}
                    </Link>
                  )}
                  description={notification.className
                    ? `${notification.className} · ${notification.message}`
                    : notification.message}
                  timestamp={formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  dateTime={notification.createdAt}
                  unread={isUnread}
                  trailing={(
                    <div className="relative z-10 flex shrink-0 items-center gap-2">
                      <StatusBadge
                        className="pointer-events-none"
                        tone={isUnread ? "primary" : "neutral"}
                        dot={isUnread}
                      >
                        {isUnread ? "Unread" : "Read"}
                      </StatusBadge>
                      {isUnread ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => handleMarkAsRead(notification.id)}
                          aria-label={`Mark ${notification.title} as read`}
                          title="Mark as read"
                          className="touch-target"
                        >
                          <Check aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  )}
                />
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}
