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
        const { count, error } = await supabase
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
    const channel = supabase
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
          const newMessage = payload.new as any
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
          const updatedMessage = payload.new as any
          if (updatedMessage.read === true) {
            // Decrement count when message is marked as read
            setUnreadCount((prev) => Math.max(0, prev - 1))
          } else if (updatedMessage.read === false) {
            // Increment count if somehow marked as unread
            setUnreadCount((prev) => prev + 1)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const pathname = usePathname()
  const isActive = pathname?.startsWith("/home/messages")

  return (
    <Link
      href="/home/messages"
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
        "hover:bg-primary/10 hover:text-primary",
        isActive
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-sidebar-foreground/70"
      )}
    >
      <MessageSquare className={cn(
        "h-4 w-4 stroke-[2]",
        isActive && "text-primary"
      )} />
      <span className="tracking-tight">Messages</span>
      {unreadCount > 0 && (
        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 min-w-[1.25rem] text-center text-[10px] font-semibold text-primary-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}

