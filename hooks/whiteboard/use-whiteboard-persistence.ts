"use client"

import { useCallback, useRef } from "react"

import type { WhiteboardOperation, WhiteboardOperationInput } from "@/types/whiteboard"

type UseWhiteboardPersistenceParams = {
  whiteboardId: string
}

export function useWhiteboardPersistence({ whiteboardId }: UseWhiteboardPersistenceParams) {
  const latestSequenceRef = useRef(0)

  const setLatestSequence = useCallback((sequence: number) => {
    latestSequenceRef.current = sequence
  }, [])

  const commitOperations = useCallback(
    async (operations: WhiteboardOperationInput[]) => {
      const response = await fetch(`/api/whiteboards/${whiteboardId}/ops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations }),
      })

      if (!response.ok) {
        throw new Error("Failed to commit whiteboard operations")
      }

      const data = (await response.json()) as {
        lastSequence: number
        operations: WhiteboardOperation[]
      }

      latestSequenceRef.current = data.lastSequence
      return data
    },
    [whiteboardId],
  )

  const fetchOperations = useCallback(
    async (afterSequence = latestSequenceRef.current) => {
      const response = await fetch(`/api/whiteboards/${whiteboardId}/ops?after=${afterSequence}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch whiteboard operations")
      }

      const data = (await response.json()) as {
        lastSequence: number
        operations: WhiteboardOperation[]
      }

      latestSequenceRef.current = data.lastSequence
      return data
    },
    [whiteboardId],
  )

  return {
    commitOperations,
    fetchOperations,
    latestSequenceRef,
    setLatestSequence,
  }
}
