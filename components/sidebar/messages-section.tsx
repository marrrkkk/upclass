"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
        const { data, error } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .eq("read", false)

        if (!error && data !== null) {
          setUnreadCount(data.length || 0)
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
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          // Refetch count on any change
          fetchUnreadCount()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <Link
      href="/home/messages"
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "text-sidebar-foreground/70"
      )}
    >
      <MessageSquare className="h-5 w-5 stroke-[1.5]" />
      <span>Messages</span>
      {unreadCount > 0 && (
        <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}

