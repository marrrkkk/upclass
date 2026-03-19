"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import type { Editor } from "tldraw"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { WhiteboardPresenceList } from "@/whiteboard/components/whiteboard-presence"
import { WhiteboardToolbar } from "@/whiteboard/components/whiteboard-toolbar"
import { TldrawBoard } from "@/whiteboard/canvas/tldraw-board"
import { WhiteboardQueryClientProvider } from "@/whiteboard/persistence/query-client-provider"
import {
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
  const [editor, setEditor] = useState<Editor | null>(null)
  const [presences, setPresences] = useState<Record<string, WhiteboardPresence>>({})
  const saveStatus = useWhiteboardUiStore((state) => state.saveStatus)
  const isUploading = useWhiteboardUiStore((state) => state.isUploading)
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

  const handleExport = () => {
    if (!editor) return

    const payload = JSON.stringify(editor.getSnapshot(), null, 2)
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${boardData.board.title.replace(/\s+/g, "-").toLowerCase()}-snapshot.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (boardQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-[70vh] w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>{className} Whiteboard</CardTitle>
            <CardDescription>
              Infinite canvas with live collaboration, debounced autosave, and Supabase-backed assets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{boardData.board.title}</Badge>
            <Badge variant={saveStatus === "error" ? "destructive" : "secondary"}>{saveStatus}</Badge>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <WhiteboardPresenceList presences={presences} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!editor}>
                <Download data-icon="inline-start" />
                Export JSON
              </Button>
            </div>
          </div>

          <WhiteboardToolbar
            editor={editor}
            fileInputRef={fileInputRef}
            isUploading={isUploading}
            onExport={handleExport}
            saveStatus={saveStatus}
          />

          <TldrawBoard
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
