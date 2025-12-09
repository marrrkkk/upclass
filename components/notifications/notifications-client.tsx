"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { Bell, Check, CheckCheck, BellOff, MessageSquare, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/app/actions/notifications"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"

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

type NotificationsClientProps = {
  notifications: NotificationData[]
  userId: string
}

export function NotificationsClient({ notifications: initialNotifications, userId }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!supabase || !userId) return

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`notifications:${userId}`)
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
            const newNotif = payload.new as any
            setNotifications((prev) => [
              {
                id: newNotif.id,
                type: newNotif.type,
                title: newNotif.title,
                message: newNotif.message,
                classId: newNotif.class_id,
                relatedId: newNotif.related_id,
                read: newNotif.read,
                createdAt: newNotif.created_at,
                className: null, // Will be fetched if needed
              },
              ...prev,
            ])
          } else if (payload.eventType === "UPDATE") {
            const updatedNotif = payload.new as any
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === updatedNotif.id
                  ? {
                      ...n,
                      read: updatedNotif.read,
                    }
                  : n,
              ),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleMarkAsRead = (notificationId: string) => {
    startTransition(async () => {
      await markNotificationAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      )
    })
  }

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    })
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const getNotificationLink = (notif: NotificationData) => {
    if (!notif.classId) return "#"
    return `/home/classes/${notif.classId}${notif.type === "classwork" ? "#classwork" : "#stream"}`
  }

  const getNotificationIcon = (type: "announcement" | "classwork") => {
    return type === "announcement" ? (
      <MessageSquare className="h-5 w-5" />
    ) : (
      <BookOpen className="h-5 w-5" />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BellOff className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Link
              key={notif.id}
              href={getNotificationLink(notif)}
              onClick={() => !notif.read && handleMarkAsRead(notif.id)}
            >
              <Card
                className={cn(
                  "transition-all hover:shadow-md cursor-pointer",
                  !notif.read && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "rounded-full p-2",
                        !notif.read ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold">{notif.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                          {notif.className && (
                            <p className="text-xs text-muted-foreground mt-1">Class: {notif.className}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleMarkAsRead(notif.id)
                            }}
                            className="text-blue-600 hover:text-blue-700"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

