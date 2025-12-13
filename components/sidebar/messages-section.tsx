"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"

type MessagesSectionProps = {
  userId: string
}

export function MessagesSection({ userId }: MessagesSectionProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!supabase || !userId) return

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase!
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .eq("read", false)

        if (!error && count !== null) {
          setUnreadCount(count)
        }
      } catch (err) {
        console.error("Error fetching unread count:", err)
      }
    }

    fetchUnreadCount()

    // Subscribe to real-time changes
    const channel = supabase!
      .channel(`messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const newMessage = payload.new as { read: boolean }
          if (newMessage.read === false) {
            setUnreadCount((prev) => prev + 1)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as { read: boolean }
          const oldMessage = payload.old as { read: boolean }

          // Only update count if read status actually changed
          if (oldMessage.read === false && updatedMessage.read === true) {
            // Decrement count when message is marked as read
            setUnreadCount((prev) => Math.max(0, prev - 1))
          } else if (oldMessage.read === true && updatedMessage.read === false) {
            // Increment count if marked as unread
            setUnreadCount((prev) => prev + 1)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const deletedMessage = payload.old as { read: boolean }
          if (deletedMessage.read === false) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [userId])

  const pathname = usePathname()
  const isActive = pathname?.startsWith("/messages")

  // Refetch count when messages page becomes active
  useEffect(() => {
    if (!supabase || !userId || !isActive) return

    const refetchCount = async () => {
      try {
        const { count, error } = await supabase!
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .eq("read", false)

        if (!error && count !== null) {
          setUnreadCount(count)
        }
      } catch (err) {
        console.error("Error refetching unread count:", err)
      }
    }

    refetchCount()
  }, [isActive, userId])


  return (
    <Link
      href="/messages"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group/item",
        isActive
          ? "bg-primary text-primary-foreground shadow-md"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <MessageSquare className={cn(
        "h-4 w-4 transition-transform group-hover/item:scale-110",
        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
      )} />
      <span>Messages</span>
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

