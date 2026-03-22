"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { WhiteboardPageData, WhiteboardSnapshotDocument } from "@/whiteboard/types"

export class WhiteboardConflictError extends Error {
  latestData: WhiteboardPageData

  constructor(latestData: WhiteboardPageData) {
    super("Whiteboard conflict detected")
    this.name = "WhiteboardConflictError"
    this.latestData = latestData
  }
}

async function fetchBoard(boardId: string) {
  const response = await fetch(`/api/whiteboards/${boardId}`, { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Failed to load whiteboard")
  }

  return (await response.json()) as WhiteboardPageData
}

type SaveSnapshotInput = {
  boardId: string
  document: WhiteboardSnapshotDocument
  expectedVersion: number
}

async function saveSnapshot({ boardId, document, expectedVersion }: SaveSnapshotInput) {
  const response = await fetch(`/api/whiteboards/${boardId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document,
      expectedVersion,
    }),
  })

  if (response.status === 409) {
    throw new WhiteboardConflictError((await response.json()) as WhiteboardPageData)
  }

  if (!response.ok) {
    throw new Error("Failed to save whiteboard snapshot")
  }

  return (await response.json()) as WhiteboardPageData
}

export function useWhiteboardBoard(boardId: string, initialData: WhiteboardPageData) {
  return useQuery({
    queryKey: ["whiteboard", boardId],
    queryFn: () => fetchBoard(boardId),
    initialData,
  })
}

export function useSaveWhiteboardSnapshot(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveSnapshot,
    onSuccess: (data) => {
      queryClient.setQueryData(["whiteboard", boardId], data)
    },
  })
}
