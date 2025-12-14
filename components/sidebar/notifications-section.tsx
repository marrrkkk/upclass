"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"
import { useNotificationsStore } from "@/lib/stores/notifications-store"

type NotificationsSectionProps = {
  userId: string
}

export function NotificationsSection({ userId }: NotificationsSectionProps) {
  const { unreadCount, updateUnreadCount, setUserId } = useNotificationsStore()

  useEffect(() => {
    setUserId(userId)
  }, [userId, setUserId])

  useEffect(() => {
    if (!supabase || !userId) return

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase!
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false)

        if (!error && count !== null) {
          updateUnreadCount(count)
        }
      } catch (err) {
        console.error("Error fetching unread count:", err)
      }
    }

    fetchUnreadCount()

    // Subscribe to real-time changes
    const channel = supabase!
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as { read: boolean }
          if (newNotif.read === false) {
            const currentCount = useNotificationsStore.getState().unreadCount
            updateUnreadCount(currentCount + 1)
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
          const updatedNotif = payload.new as { read: boolean }
          const oldNotif = payload.old as { read: boolean }

          // Only update count if read status actually changed
          if (oldNotif.read === false && updatedNotif.read === true) {
            // Decrement count when notification is marked as read
            const currentCount = useNotificationsStore.getState().unreadCount
            updateUnreadCount(Math.max(0, currentCount - 1))
          } else if (oldNotif.read === true && updatedNotif.read === false) {
            // Increment count if marked as unread
            const currentCount = useNotificationsStore.getState().unreadCount
            updateUnreadCount(currentCount + 1)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedNotif = payload.old as { read: boolean }
          if (deletedNotif.read === false) {
            const currentCount = useNotificationsStore.getState().unreadCount
            updateUnreadCount(Math.max(0, currentCount - 1))
          }
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [userId, updateUnreadCount])

  const pathname = usePathname()
  const isActive = pathname === "/notifications"

  // Refetch count when notifications page becomes active
  useEffect(() => {
    if (!supabase || !userId || !isActive) return

    const refetchCount = async () => {
      try {
        const { count, error } = await supabase!
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false)

        if (!error && count !== null) {
          updateUnreadCount(count)
        }
      } catch (err) {
        console.error("Error refetching unread count:", err)
      }
    }

    refetchCount()
  }, [isActive, userId, updateUnreadCount])


  return (
    <Link
      href="/notifications"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group/item",
        isActive
          ? "bg-primary text-primary-foreground shadow-md"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Bell className={cn(
        "h-4 w-4 transition-transform group-hover/item:shake",
        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
      )} />
      <span>Notifications</span>
      {unreadCount > 0 && (
        <span className={cn(
          "ml-auto rounded-full px-2 py-0.5 min-w-[1.25rem] text-center text-[10px] font-bold shadow-sm",
          isActive
            ? "bg-white text-primary"
            : "bg-primary text-primary-foreground"
        )}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}

