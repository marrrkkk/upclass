"use client"

import dynamic from "next/dynamic"
import { useCallback, useMemo, useRef, useState } from "react"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { WhiteboardPresenceList } from "@/whiteboard/components/whiteboard-presence"
import { WhiteboardQueryClientProvider } from "@/whiteboard/persistence/query-client-provider"
import {
  useSaveWhiteboardSnapshot,
  useWhiteboardBoard,
} from "@/whiteboard/persistence/use-whiteboard-queries"
import type {
  WhiteboardPageData,
  WhiteboardPresence,
  WhiteboardPresenceUser,
  WhiteboardSnapshotDocument,
} from "@/whiteboard/types"
import { getPresenceColor } from "@/whiteboard/utils/presence"

const ExcalidrawBoard = dynamic(
  () => import("@/whiteboard/canvas/excalidraw-board").then((mod) => mod.ExcalidrawBoard),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[70vh] w-full rounded-2xl" />,
  },
)

type WhiteboardPageClientProps = {
  className: string
  initialData: WhiteboardPageData
  currentUser: {
    id: string
    name: string
    image: string | null
  }
}

function WhiteboardPageClientInner({
  className,
  initialData,
  currentUser,
}: WhiteboardPageClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, setEditor] = useState<ExcalidrawImperativeAPI | null>(null)
  const [presences, setPresences] = useState<Record<string, WhiteboardPresence>>({})
  const boardQuery = useWhiteboardBoard(initialData.board.id, initialData)
  const saveMutation = useSaveWhiteboardSnapshot(initialData.board.id)
  const boardData = boardQuery.data ?? initialData

  const presenceUser = useMemo<WhiteboardPresenceUser>(
    () => ({
      id: currentUser.id,
      name: currentUser.name,
      image: currentUser.image,
      color: getPresenceColor(currentUser.id),
    }),
    [currentUser.id, currentUser.image, currentUser.name],
  )

  const handlePersistSnapshot = useCallback(
    async (document: WhiteboardSnapshotDocument, version: number) => {
      const result = await saveMutation.mutateAsync({
        boardId: boardData.board.id,
        document,
        version,
      })

      return result.snapshot.version
    },
    [boardData.board.id, saveMutation],
  )

  if (boardQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-[70vh] w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="gap-3">
          <CardTitle>{className} Whiteboard</CardTitle>
          <WhiteboardPresenceList currentUser={presenceUser} presences={presences} />
        </CardHeader>
        <CardContent>
          <ExcalidrawBoard
            boardId={boardData.board.id}
            currentUser={presenceUser}
            fileInputRef={fileInputRef}
            onEditorMount={setEditor}
            onPersistSnapshot={handlePersistSnapshot}
            onPresencesChange={setPresences}
            snapshot={boardData.snapshot}
          />
        </CardContent>
      </Card>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
    </div>
  )
}

export function WhiteboardPageClient(props: WhiteboardPageClientProps) {
  return (
    <WhiteboardQueryClientProvider>
      <WhiteboardPageClientInner {...props} />
    </WhiteboardQueryClientProvider>
  )
}
