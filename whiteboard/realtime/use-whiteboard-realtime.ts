"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { supabase } from "@/lib/supabase-client"
import type {
  WhiteboardCursorUpdateEvent,
  WhiteboardPresence,
  WhiteboardPresenceUser,
  WhiteboardRealtimeEvent,
  WhiteboardShapeUpdateEvent,
} from "@/whiteboard/types"

type UseWhiteboardRealtimeParams = {
  boardId: string
  clientId: string
  currentUser: WhiteboardPresenceUser
  onRemoteShapeEvent: (event: WhiteboardShapeUpdateEvent) => void
}

type PresencePayload = {
  boardId: string
  user: WhiteboardPresenceUser
  cursor: WhiteboardPresence["cursor"]
  camera: WhiteboardPresence["camera"]
  selectedShapeIds: string[]
  joinedAt: string
  lastSeenAt: string
}

const CURSOR_BROADCAST_MS = 24
const PRESENCE_TRACK_MS = 250

export function useWhiteboardRealtime({
  boardId,
  clientId,
  currentUser,
  onRemoteShapeEvent,
}: UseWhiteboardRealtimeParams) {
  const [presences, setPresences] = useState<Record<string, WhiteboardPresence>>({})
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null)
  const latestPresenceRef = useRef<PresencePayload | null>(null)
  const cursorBroadcastTimeoutRef = useRef<number | null>(null)
  const presenceTrackTimeoutRef = useRef<number | null>(null)

  const syncPresenceState = useCallback(() => {
    const channel = channelRef.current
    if (!channel) return

    const state = channel.presenceState() as Record<string, PresencePayload[]>

    setPresences((current) => {
      const next = { ...current }

      for (const entries of Object.values(state)) {
        for (const presence of entries) {
          if (presence.user.id === currentUser.id) continue

          next[presence.user.id] = {
            boardId: presence.boardId,
            user: presence.user,
            cursor: current[presence.user.id]?.cursor ?? presence.cursor,
            camera: presence.camera,
            selectedShapeIds: presence.selectedShapeIds,
            joinedAt: presence.joinedAt,
            lastSeenAt: presence.lastSeenAt,
          }
        }
      }

      return next
    })
  }, [currentUser.id])

  useEffect(() => {
    if (!supabase) return

    const supabaseClient = supabase
    const joinedAt = new Date().toISOString()
    const channel = supabaseClient
      .channel(`whiteboard:${boardId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: currentUser.id },
        },
      })
      .on("broadcast", { event: "shape_update" }, ({ payload }) => {
        const event = payload as WhiteboardShapeUpdateEvent
        if (event.actorId === currentUser.id || event.clientId === clientId) {
          return
        }

        onRemoteShapeEvent(event)
      })
      .on("broadcast", { event: "cursor_update" }, ({ payload }) => {
        const event = payload as WhiteboardCursorUpdateEvent
        if (event.actorId === currentUser.id || event.clientId === clientId) {
          return
        }

        setPresences((current) => ({
          ...current,
          [event.presence.user.id]: event.presence,
        }))
      })
      .on("presence", { event: "sync" }, syncPresenceState)
      .on("presence", { event: "join" }, syncPresenceState)
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const departedUserIds = (leftPresences as unknown as PresencePayload[]).map((presence) => presence.user.id)

        setPresences((current) => {
          const next = { ...current }
          for (const userId of departedUserIds) {
            delete next[userId]
          }
          return next
        })
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return

        channelRef.current = channel

        const initialPresence: PresencePayload = {
          boardId,
          user: currentUser,
          cursor: null,
          camera: null,
          selectedShapeIds: [],
          joinedAt,
          lastSeenAt: new Date().toISOString(),
        }

        latestPresenceRef.current = initialPresence
        await channel.track(initialPresence)
      })

    channelRef.current = channel

    return () => {
      if (cursorBroadcastTimeoutRef.current) {
        window.clearTimeout(cursorBroadcastTimeoutRef.current)
      }
      if (presenceTrackTimeoutRef.current) {
        window.clearTimeout(presenceTrackTimeoutRef.current)
      }

      void channel.untrack()
      void supabaseClient.removeChannel(channel)
      channelRef.current = null
    }
  }, [boardId, clientId, currentUser, onRemoteShapeEvent, syncPresenceState])

  const broadcastShapeEvent = useCallback(
    (event: WhiteboardShapeUpdateEvent) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "shape_update",
        payload: event satisfies WhiteboardRealtimeEvent,
      })
    },
    [],
  )

  const updatePresence = useCallback(
    (input: Partial<Pick<WhiteboardPresence, "cursor" | "camera" | "selectedShapeIds">>) => {
      const channel = channelRef.current
      const currentPresence = latestPresenceRef.current
      if (!channel || !currentPresence) return

      const nextPresence: WhiteboardPresence = {
        ...currentPresence,
        ...input,
        lastSeenAt: new Date().toISOString(),
      }

      latestPresenceRef.current = nextPresence

      if (cursorBroadcastTimeoutRef.current) {
        window.clearTimeout(cursorBroadcastTimeoutRef.current)
      }

      cursorBroadcastTimeoutRef.current = window.setTimeout(() => {
        const currentBroadcastPresence = latestPresenceRef.current
        if (!currentBroadcastPresence) return

        void channel.send({
          type: "broadcast",
          event: "cursor_update",
          payload: {
            type: "cursor_update",
            boardId,
            actorId: currentUser.id,
            clientId,
            presence: currentBroadcastPresence,
            sentAt: new Date().toISOString(),
          } satisfies WhiteboardRealtimeEvent,
        })
      }, CURSOR_BROADCAST_MS)

      if (presenceTrackTimeoutRef.current) {
        window.clearTimeout(presenceTrackTimeoutRef.current)
      }

      presenceTrackTimeoutRef.current = window.setTimeout(() => {
        const trackedPresence = latestPresenceRef.current
        if (!trackedPresence) return

        void channel.track(trackedPresence)
      }, PRESENCE_TRACK_MS)
    },
    [boardId, clientId, currentUser.id],
  )

  return useMemo(
    () => ({
      presences,
      broadcastShapeEvent,
      updatePresence,
    }),
    [broadcastShapeEvent, presences, updatePresence],
  )
}

