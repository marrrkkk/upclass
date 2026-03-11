"use client"

import { useCallback, useEffect, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"

import { supabase } from "@/lib/supabase-client"
import type {
  CursorData,
  SelectionState,
  WhiteboardElement,
  WhiteboardOperation,
  WhiteboardPoint,
  WhiteboardUser,
} from "@/types/whiteboard"

type UseWhiteboardRealtimeParams = {
  currentUser: WhiteboardUser
  onReconnect?: () => void
  latestSequenceRef: { current: number }
  onCommittedOperations?: (operations: WhiteboardOperation[]) => void
  setCursors: Dispatch<SetStateAction<Map<string, CursorData>>>
  setElements: Dispatch<SetStateAction<WhiteboardElement[]>>
  setSelection: Dispatch<SetStateAction<SelectionState>>
  whiteboardId: string
}

type BroadcastMessage = {
  type: "broadcast"
  event: string
  payload: Record<string, unknown>
}

type BroadcastChannelLike = {
  send: (payload: BroadcastMessage) => void
}

export function useWhiteboardRealtime({
  currentUser,
  onReconnect,
  latestSequenceRef,
  onCommittedOperations,
  setCursors,
  setElements,
  setSelection,
  whiteboardId,
}: UseWhiteboardRealtimeParams) {
  const broadcastChannelRef = useRef<BroadcastChannelLike | null>(null)
  const broadcastQueueRef = useRef<BroadcastMessage[]>([])
  const broadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const elementUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingElementUpdateRef = useRef<WhiteboardElement | null>(null)
  const lastCursorUpdateRef = useRef(0)

  const sendBroadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    broadcastChannelRef.current?.send({
      type: "broadcast",
      event,
      payload,
    })
  }, [])

  const queueDrawingPoint = useCallback((elementId: string, point: WhiteboardPoint) => {
    broadcastQueueRef.current.push({
      type: "broadcast",
      event: "drawing-point",
      payload: { elementId, point },
    })

    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current)
    }

    broadcastTimeoutRef.current = setTimeout(() => {
      const channel = broadcastChannelRef.current
      if (!channel || broadcastQueueRef.current.length === 0) return

      const points = broadcastQueueRef.current
        .filter((message) => message.event === "drawing-point" && message.payload.elementId === elementId)
        .map((message) => message.payload.point as WhiteboardPoint)

      if (points.length > 0) {
        channel.send({
          type: "broadcast",
          event: "drawing-points-batch",
          payload: { elementId, points },
        })
      }

      broadcastQueueRef.current
        .filter((message) => message.event !== "drawing-point")
        .forEach((message) => channel.send(message))

      broadcastQueueRef.current = []
    }, 100)
  }, [])

  const queueElementUpdate = useCallback((element: WhiteboardElement) => {
    pendingElementUpdateRef.current = element

    if (elementUpdateTimeoutRef.current) {
      clearTimeout(elementUpdateTimeoutRef.current)
    }

    elementUpdateTimeoutRef.current = setTimeout(() => {
      const nextElement = pendingElementUpdateRef.current
      if (!nextElement) return

      sendBroadcast("element-update", { element: nextElement })
      pendingElementUpdateRef.current = null
    }, 80)
  }, [sendBroadcast])

  const broadcastCursor = useCallback(
    (position: WhiteboardPoint) => {
      const now = Date.now()
      if (now - lastCursorUpdateRef.current <= 100) return

      sendBroadcast("cursor-move", {
        userId: currentUser.id,
        x: position.x,
        y: position.y,
        user: currentUser,
      })

      lastCursorUpdateRef.current = now
    },
    [currentUser, sendBroadcast],
  )

  useEffect(() => {
    if (!supabase) return

    const supabaseClient = supabase

    const channel = supabaseClient
      .channel(`whiteboard-broadcast:${whiteboardId}`, {
        config: { broadcast: { self: true } },
      })
      .on("broadcast", { event: "drawing-start" }, (payload) => {
        const element = payload.payload.element as WhiteboardElement | undefined
        if (!element || element.userId === currentUser.id) return
        setElements((previous) => (previous.find((entry) => entry.id === element.id) ? previous : [...previous, element]))
      })
      .on("broadcast", { event: "drawing-points-batch" }, (payload) => {
        const elementId = payload.payload.elementId as string | undefined
        const points = payload.payload.points as WhiteboardPoint[] | undefined
        if (!elementId || !Array.isArray(points)) return

        setElements((previous) =>
          previous.map((element) => {
            if (element.id !== elementId || element.type !== "draw" || element.userId === currentUser.id) {
              return element
            }

            return {
              ...element,
              data: {
                ...element.data,
                points: [...element.data.points, ...points],
              },
            }
          }),
        )
      })
      .on("broadcast", { event: "drawing-complete" }, (payload) => {
        const element = payload.payload.element as WhiteboardElement | undefined
        if (!element || element.userId === currentUser.id) return

        setElements((previous) =>
          previous.map((entry) => (entry.id === element.id ? element : entry)),
        )
      })
      .on("broadcast", { event: "element-add" }, (payload) => {
        const element = payload.payload.element as WhiteboardElement | undefined
        if (!element || element.userId === currentUser.id) return
        setElements((previous) => (previous.find((entry) => entry.id === element.id) ? previous : [...previous, element]))
      })
      .on("broadcast", { event: "operations-committed" }, (payload) => {
        const operations = payload.payload.operations as WhiteboardOperation[] | undefined
        if (!operations || operations.length === 0) return

        const incomingMaxSequence = Math.max(
          latestSequenceRef.current,
          ...operations.map((operation) => operation.sequence),
        )
        latestSequenceRef.current = incomingMaxSequence
        onCommittedOperations?.(operations)
      })
      .on("broadcast", { event: "element-update" }, (payload) => {
        const element = payload.payload.element as WhiteboardElement | undefined
        if (!element || element.userId === currentUser.id) return

        setElements((previous) => {
          const existing = previous.find((entry) => entry.id === element.id)
          if (!existing) return previous
          if (existing.createdAt === element.createdAt && existing.type === element.type) {
            const existingData = JSON.stringify(existing.data)
            const nextData = JSON.stringify(element.data)
            if (existingData === nextData) {
              return previous
            }
          }
          return previous.map((entry) => (entry.id === element.id ? element : entry))
        })
      })
      .on("broadcast", { event: "element-remove" }, (payload) => {
        const elementId = payload.payload.elementId as string | undefined
        if (!elementId) return
        setElements((previous) => previous.filter((element) => element.id !== elementId))
      })
      .on("broadcast", { event: "clear" }, () => {
        setElements([])
        setSelection({
          elementId: null,
          isDragging: false,
          isResizing: false,
          resizeHandle: null,
          dragStart: null,
        })
      })
      .on("broadcast", { event: "cursor-move" }, (payload) => {
        const userId = payload.payload.userId as string | undefined
        const x = payload.payload.x as number | undefined
        const y = payload.payload.y as number | undefined
        const user = payload.payload.user as WhiteboardUser | undefined
        if (!userId || userId === currentUser.id || x === undefined || y === undefined || !user) return

        setCursors((previous) => {
          const updated = new Map(previous)
          updated.set(userId, { userId, x, y, user })
          return updated
        })

        setTimeout(() => {
          setCursors((previous) => {
            const updated = new Map(previous)
            updated.delete(userId)
            return updated
          })
        }, 2000)
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          broadcastChannelRef.current = channel as BroadcastChannelLike
          onReconnect?.()
        }
      })

    return () => {
      supabaseClient.removeChannel(channel)

      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current)
      }
      if (elementUpdateTimeoutRef.current) {
        clearTimeout(elementUpdateTimeoutRef.current)
      }

      broadcastChannelRef.current = null
    }
  }, [currentUser, latestSequenceRef, onCommittedOperations, onReconnect, setCursors, setElements, setSelection, whiteboardId])

  return {
    broadcastCursor,
    queueElementUpdate,
    queueDrawingPoint,
    sendBroadcast,
  }
}
