"use client"

import { useEffect, useTransition } from "react"
import Link from "next/link"
import { Check, CheckCheck, BellOff, MessageSquare, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/app/actions/notifications"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { useNotificationsStore } from "@/stores/notifications-store"
import { useCacheData, useOfflineCollectionCache } from "@/lib/cache-hooks"
import { BackgroundCache } from "@/lib/background-cache"

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
  const { setNotifications, setUserId, notifications: storeNotifications, addNotification, updateNotification, markAsRead, markAllAsRead, unreadCount } = useNotificationsStore()
  const [pending, startTransition] = useTransition()
  
  useEffect(() => {
    const hasServerNotifications = initialNotifications.length > 0
    const isOffline = typeof window !== "undefined" && !navigator.onLine

    if (isOffline && !hasServerNotifications) {
      setUserId(userId)
      return
    }

    setNotifications(initialNotifications)
    setUserId(userId)
  }, [initialNotifications, userId, setNotifications, setUserId])

  // Cache notifications in background
  useCacheData(storeNotifications, 'notifications', true)

  useOfflineCollectionCache<NotificationData>({
    onlineData: initialNotifications,
    getCachedData: () => BackgroundCache.getInstance().getCachedNotifications(),
    onHydrate: setNotifications,
  })

  useEffect(() => {
    if (typeof window === "undefined" || navigator.onLine) return

    let cancelled = false

    const hydrateOfflineNotifications = async () => {
      const cachedNotifications = await BackgroundCache.getInstance().getCachedNotifications()
      if (cancelled || cachedNotifications.length === 0) return

      setNotifications(cachedNotifications)
      setUserId(userId)
    }

    void hydrateOfflineNotifications()

    return () => {
      cancelled = true
    }
  }, [setNotifications, setUserId, userId])

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
            addNotification({
              id: newNotif.id,
              type: newNotif.type,
              title: newNotif.title,
              message: newNotif.message,
              classId: newNotif.class_id,
              relatedId: newNotif.related_id,
              read: newNotif.read,
              createdAt: newNotif.created_at,
              className: null, // Will be fetched if needed
            })
          } else if (payload.eventType === "UPDATE") {
            const updatedNotif = payload.new as { id: string; read: boolean }
            updateNotification(updatedNotif.id, { read: updatedNotif.read })
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
      markAsRead(notificationId)
    })
  }

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead()
      markAllAsRead()
    })
  }

  const getNotificationLink = (notif: NotificationData) => {
    if (!notif.classId) return "#"
    return `/classes/${notif.classId}${notif.type === "classwork" ? "#classwork" : "#stream"}`
  }

  const getNotificationStyle = (type: "announcement" | "classwork") => {
    if (type === "announcement") {
      return {
        icon: <MessageSquare className="h-5 w-5" />,
        color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      }
    }
    return {
      icon: <BookOpen className="h-5 w-5" />,
      color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your latest class activities.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            disabled={pending}
            variant="outline"
            size="sm"
            className="gap-2 transition-all hover:bg-primary/5 active:scale-95 self-start sm:self-center"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {storeNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-50 duration-500">
          <div className="rounded-full bg-muted/50 p-6 mb-6">
            <BellOff className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">All caught up!</h3>
          <p className="mt-2 text-muted-foreground max-w-sm">
            You have no new notifications at the moment. Check back later for updates from your classes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {storeNotifications.map((notif) => {
            const style = getNotificationStyle(notif.type)
            return (
              <Link
                key={notif.id}
                href={getNotificationLink(notif)}
                onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                className="group block relative"
              >
                <div
                  className={cn(
                    "relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-300",
                    "hover:shadow-md hover:-translate-y-0.5 hover:border-border/80",
                    !notif.read
                      ? "bg-card border-primary/20 shadow-sm"
                      : "bg-card/40 border-border/40 opacity-90 hover:opacity-100"
                  )}
                >
                  {/* Unread Indicator */}
                  {!notif.read && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  )}

                  {/* Icon */}
                  <div className={cn(
                    "rounded-xl p-3 shrink-0 transition-colors duration-300",
                    style.color
                  )}>
                    {style.icon}
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-semibold text-base leading-none",
                            !notif.read ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {notif.title}
                          </h4>
                          {notif.className && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
                              {notif.className}
                            </Badge>
                          )}
                        </div>
                        <p className={cn(
                          "text-sm line-clamp-2",
                          !notif.read ? "text-foreground/80" : "text-muted-foreground/70"
                        )}>{notif.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button (Hover) */}
                  {!notif.read && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleMarkAsRead(notif.id)
                        }}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
