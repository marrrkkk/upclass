"use client"

import dynamic from "next/dynamic"
import { useCallback, useMemo, useRef, useState } from "react"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { RefreshCw } from "lucide-react"

import { OfflineRouteGuard } from "@/components/offline-route-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WhiteboardPresenceList } from "@/whiteboard/components/whiteboard-presence"
import { WhiteboardQueryClientProvider } from "@/whiteboard/persistence/query-client-provider"
import {
  WhiteboardConflictError,
  useSaveWhiteboardSnapshot,
  useWhiteboardBoard,
} from "@/whiteboard/persistence/use-whiteboard-queries"
import { useWhiteboardUiStore } from "@/whiteboard/state/use-whiteboard-ui-store"
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
  const [conflictData, setConflictData] = useState<WhiteboardPageData | null>(null)
  const boardQuery = useWhiteboardBoard(initialData.board.id, initialData)
  const saveMutation = useSaveWhiteboardSnapshot(initialData.board.id)
  const boardData = boardQuery.data ?? initialData
  const setSaveStatus = useWhiteboardUiStore((state) => state.setSaveStatus)

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
      try {
        const result = await saveMutation.mutateAsync({
          boardId: boardData.board.id,
          document,
          expectedVersion: version,
        })

        setConflictData(null)
        return result.snapshot.version
      } catch (error) {
        if (error instanceof WhiteboardConflictError) {
          setConflictData(error.latestData)
        }

        throw error
      }
    },
    [boardData.board.id, saveMutation],
  )

  const handleReloadLatest = useCallback(async () => {
    setSaveStatus("saving")
    await boardQuery.refetch()
    setConflictData(null)
    setSaveStatus("saved")
  }, [boardQuery, setSaveStatus])

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
      {conflictData ? (
        <Alert>
          <AlertTitle>Whiteboard conflict detected</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Another user saved a newer board version. Reload the latest board state before
              continuing to avoid overwriting newer work.
            </span>
            <Button size="sm" variant="outline" onClick={() => void handleReloadLatest()}>
              <RefreshCw data-icon="inline-start" />
              Reload latest
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden border-border/80 shadow-sm sm:rounded-2xl">
        <CardHeader className="gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-2xl">{className} Whiteboard</CardTitle>
              <CardDescription className="mt-1 text-xs leading-5 sm:text-sm">
                Pinch to zoom, draw with touch, and rotate your device for a wider canvas when needed.
              </CardDescription>
            </div>
          </div>
          <WhiteboardPresenceList currentUser={presenceUser} presences={presences} />
        </CardHeader>
        <CardContent className="p-0">
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
    <OfflineRouteGuard
      title="You're offline"
      description="The whiteboard needs an internet connection for live collaboration and saving board updates."
      backHref={`/classes/${props.initialData.board.classId}`}
      backLabel="Back to Class"
    >
      <WhiteboardQueryClientProvider>
        <WhiteboardPageClientInner {...props} />
      </WhiteboardQueryClientProvider>
    </OfflineRouteGuard>
  )
}
