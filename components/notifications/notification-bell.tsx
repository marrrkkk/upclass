"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Bell, BellOff, CheckCheck, ChevronRight, MessageSquare, BookOpen, type LucideIcon } from "lucide-react"

import { markAllNotificationsAsRead } from "@/app/actions/notifications"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/ui/status-badge"
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { supabase } from "@/lib/supabase-client"
import { useUnreadStore } from "@/stores/unread-store"
import { cn } from "@/lib/utils"

type BellNotification = {
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

type NotificationBellProps = {
  userId: string
}

function getNotificationPresentation(type: BellNotification["type"]): { Icon: LucideIcon; tone: string } {
  if (type === "announcement") return { Icon: MessageSquare, tone: "text-primary-strong" }
  return { Icon: BookOpen, tone: "text-warning-strong" }
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const organizationPath = useOrganizationPath()
  const unreadCount = useUnreadStore((state) => state.notificationUnread)
  const setNotificationUnread = useUnreadStore((state) => state.setNotificationUnread)
  const [notifications, setNotifications] = useState<BellNotification[]>([])
  const { mutate, pending } = useOptimisticMutation<BellNotification[]>(
    notifications,
    setNotifications,
  )

  useEffect(() => {
    if (!supabase || !userId) return

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase!
          .from("notifications")
          .select("id, type, title, message, class_id, related_id, read, created_at, classes(title)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) throw error

        setNotifications(
          (data ?? []).map((row: Record<string, unknown>) => ({
            id: String(row.id),
            type: (row.type === "announcement" ? "announcement" : "classwork") as BellNotification["type"],
            title: String(row.title),
            message: String(row.message),
            classId: row.class_id ? String(row.class_id) : null,
            relatedId: row.related_id ? String(row.related_id) : null,
            read: Boolean(row.read),
            createdAt: String(row.created_at),
            className: (row.classes as { title?: string } | null)?.title ?? null,
          })),
        )
      } catch (err) {
        console.error("Error fetching notifications:", err)
      }
    }

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase!
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false)

        if (!error && count !== null) {
          setNotificationUnread(count)
        }
      } catch (err) {
        console.error("Error fetching unread count:", err)
      }
    }

    void fetchLatest()
    void fetchUnreadCount()

    const channel = supabase!
      .channel(`notifications-bell:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const created: BellNotification = {
            id: String(row.id),
            type: (row.type === "announcement" ? "announcement" : "classwork") as BellNotification["type"],
            title: String(row.title),
            message: String(row.message),
            classId: row.class_id ? String(row.class_id) : null,
            relatedId: row.related_id ? String(row.related_id) : null,
            read: Boolean(row.read),
            createdAt: String(row.created_at),
            className: null,
          }
          setNotifications((current) => [created, ...current].slice(0, 5))
          if (!created.read) {
            setNotificationUnread(useUnreadStore.getState().notificationUnread + 1)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; read: boolean }
          const previous = payload.old as { read: boolean }
          setNotifications((current) =>
            current.map((n) => (n.id === updated.id ? { ...n, read: updated.read } : n)),
          )
          if (previous.read === false && updated.read === true) {
            setNotificationUnread(Math.max(0, useUnreadStore.getState().notificationUnread - 1))
          } else if (previous.read === true && updated.read === false) {
            setNotificationUnread(useUnreadStore.getState().notificationUnread + 1)
          }
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [userId, setNotificationUnread])

  const handleMarkAllAsRead = () => {
    setNotificationUnread(0)

    void mutate(
      (current) => current.map((n) => ({ ...n, read: true })),
      () => markAllNotificationsAsRead(),
      {
        onSuccess: (_result, current) => {
          setNotificationUnread(0)
          return current
        },
        onError: (_message, current) => {
          setNotificationUnread(current.filter((n) => !n.read).length)
          return current
        },
      },
    )
  }

  const getNotificationHref = (notification: BellNotification) => {
    if (!notification.classId) return organizationPath("/notifications")
    const classPath = organizationPath(`/classes/${notification.classId}`)
    return `${classPath}${notification.type === "classwork" ? "#classwork" : "#stream"}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          className="focus-ring relative flex size-9 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <Bell className="size-[1.15rem]" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none tabular-nums text-primary-foreground ring-2 ring-card"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80" sideOffset={8}>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="type-small font-semibold text-foreground">Notifications</p>
          <StatusBadge tone={unreadCount > 0 ? "primary" : "neutral"} dot={unreadCount > 0}>
            <span className="numeric-tabular">{unreadCount}</span> unread
          </StatusBadge>
        </div>

        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellOff className="size-5 text-muted-foreground/60" aria-hidden="true" />
            <p className="type-small text-muted-foreground">All caught up</p>
            <p className="type-caption text-muted-foreground/80">New class updates will appear here.</p>
          </div>
        ) : (
          <DropdownMenuGroup className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const { Icon, tone } = getNotificationPresentation(notification.type)
              const isUnread = !notification.read
              return (
                <DropdownMenuItem key={notification.id} asChild className="cursor-pointer">
                  <Link
                    href={getNotificationHref(notification)}
                    className={cn("items-start gap-3 px-3 py-2.5", isUnread && "bg-primary-surface/50")}
                  >
                    <span className={cn("mt-0.5 [&>svg]:size-4", tone)} aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block truncate type-small font-medium text-foreground">
                        {notification.title}
                      </span>
                      <span className="block line-clamp-2 type-caption text-muted-foreground">
                        {notification.className
                          ? `${notification.className} · ${notification.message}`
                          : notification.message}
                      </span>
                      <span className="block type-caption text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                    {isUnread ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    ) : null}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        )}

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              isLoading={pending}
              disabled={pending}
            >
              <CheckCheck aria-hidden="true" />
              Mark all read
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href={organizationPath("/notifications")}>
              View all
              <ChevronRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}