"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { SidebarCount, SidebarNavLink } from "@/components/sidebar/sidebar-nav-link"
import { supabase } from "@/lib/supabase-client"
import { authorizeSupabaseRealtime } from "@/lib/supabase-realtime-auth"

type MessagesSectionProps = {
  userId: string
  onNavigate?: () => void
  collapsed?: boolean
}

export function MessagesSection({ userId, onNavigate, collapsed = false }: MessagesSectionProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()

  // Extract org slug from pathname
  const orgSlug = pathname?.split('/')[1] || ''
  const messagesPath = orgSlug ? `/${orgSlug}/messages` : '/messages'
  const activePath = pathname || "/"
  const isActive = activePath === messagesPath || activePath.startsWith(`${messagesPath}/`)

  useEffect(() => {
    if (!supabase || !userId) return

    let cancelled = false
    // Fetch initial unread count through authenticated app API.
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/messages/unread?orgSlug=${encodeURIComponent(orgSlug)}`, { cache: "no-store" })
        if (response.ok && !cancelled) setUnreadCount((await response.json()).count || 0)
      } catch (err) {
        console.error("Error fetching unread count:", err)
      }
    }

    fetchUnreadCount()

    // Subscribe to real-time changes
    let channel: ReturnType<typeof supabase.channel> | null = null
    void authorizeSupabaseRealtime().then((authorized) => {
      if (!authorized || cancelled || !supabase) return
      channel = supabase
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
    })

    return () => {
      cancelled = true
      if (channel) supabase?.removeChannel(channel)
    }
  }, [userId])

  // Refetch count when messages page becomes active
  useEffect(() => {
    if (!supabase || !userId || !isActive) return

    const refetchCount = async () => {
      try {
        const response = await fetch(`/api/messages/unread?orgSlug=${encodeURIComponent(orgSlug)}`, { cache: "no-store" })
        if (response.ok) setUnreadCount((await response.json()).count || 0)
      } catch (err) {
        console.error("Error refetching unread count:", err)
      }
    }

    refetchCount()
  }, [isActive, userId])


  return (
    <SidebarNavLink
      href={messagesPath}
      active={Boolean(isActive)}
      icon={<MessageSquare />}
      label="Messages"
      trailing={collapsed ? undefined : <SidebarCount count={unreadCount} />}
      collapsed={collapsed}
      onClick={onNavigate}
    />
  )
}

