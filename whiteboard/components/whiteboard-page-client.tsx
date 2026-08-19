"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useMemo, useRef, useState } from "react"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { ArrowLeft, RefreshCw } from "lucide-react"

import { OfflineRouteGuard } from "@/components/offline-route-guard"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import {
  Panel,
  PanelActions,
  PanelBody,
  PanelHeader,
  PanelHeading,
} from "@/components/ui/panel"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { useOrganizationPath } from "@/hooks/use-organization-path"
import { WhiteboardPresenceList } from "@/whiteboard/components/whiteboard-presence"
import { WhiteboardQueryClientProvider } from "@/whiteboard/persistence/query-client-provider"
import {
  WhiteboardConflictError,
  useSaveWhiteboardSnapshot,
  useWhiteboardBoard,
} from "@/whiteboard/persistence/use-whiteboard-queries"
import { useWhiteboardUiStore } from "@/whiteboard/state/use-whiteboard-ui-store"
import type {
  SaveStatus,
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
    loading: () => (
      <Skeleton className="h-[calc(100dvh-18rem)] min-h-[28rem] w-full rounded-xl" />
    ),
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

type SaveStatusPresentation = {
  label: string
  tone: "success" | "info" | "warning" | "danger"
}

const SAVE_STATUS_PRESENTATION: Record<SaveStatus, SaveStatusPresentation> = {
  saved: { label: "Saved", tone: "success" },
  saving: { label: "Saving", tone: "info" },
  offline: { label: "Offline", tone: "warning" },
  conflict: { label: "Conflict", tone: "warning" },
  error: { label: "Save failed", tone: "danger" },
}

function WhiteboardPageClientInner({
  className,
  initialData,
  currentUser,
  backHref,
}: WhiteboardPageClientProps & { backHref: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, setEditor] = useState<ExcalidrawImperativeAPI | null>(null)
  const [presences, setPresences] = useState<Record<string, WhiteboardPresence>>({})
  const [conflictData, setConflictData] = useState<WhiteboardPageData | null>(null)
  const boardQuery = useWhiteboardBoard(initialData.board.id, initialData)
  const saveMutation = useSaveWhiteboardSnapshot(initialData.board.id)
  const boardData = boardQuery.data ?? initialData
  const saveStatus = useWhiteboardUiStore((state) => state.saveStatus)
  const isUploading = useWhiteboardUiStore((state) => state.isUploading)
  const setSaveStatus = useWhiteboardUiStore((state) => state.setSaveStatus)
  const status = SAVE_STATUS_PRESENTATION[saveStatus]

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
      <div className="space-y-4" role="status" aria-label="Loading whiteboard">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-[calc(100dvh-18rem)] min-h-[28rem] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      {conflictData ? (
        <Callout
          tone="warning"
          role="alert"
          action={(
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleReloadLatest()}
              disabled={boardQuery.isFetching}
              isLoading={boardQuery.isFetching}
            >
              <RefreshCw aria-hidden="true" />
              Reload latest
            </Button>
          )}
        >
          <div className="space-y-1">
            <Text as="p" variant="h4">Newer board version available</Text>
            <Text as="p" variant="small">
              Another collaborator saved newer work. Reload it before continuing so their changes
              are not overwritten.
            </Text>
          </div>
        </Callout>
      ) : null}

      <Panel padding="none" className="overflow-hidden">
        <PanelHeader className="items-start">
          <PanelHeading className="flex min-w-0 items-start gap-3">
            <Button asChild variant="ghost" size="icon-sm">
              <Link href={backHref} aria-label={`Back to ${className}`}>
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
            <div className="min-w-0 space-y-1">
              <Text variant="overline" tone="muted">Live class workspace</Text>
              <Text as="h1" variant="h2" truncate>{className} whiteboard</Text>
              <Text variant="small" tone="muted">
                Shared canvas for live class work.
              </Text>
            </div>
          </PanelHeading>

          <PanelActions className="w-full flex-wrap justify-between sm:w-auto sm:justify-end">
            <div aria-live="polite" aria-atomic="true">
              <StatusBadge tone={isUploading ? "info" : status.tone} dot>
                {isUploading ? "Uploading image" : status.label}
              </StatusBadge>
            </div>
            <WhiteboardPresenceList currentUser={presenceUser} presences={presences} />
          </PanelActions>
        </PanelHeader>

        <PanelBody className="p-0">
          <ExcalidrawBoard
            boardId={boardData.board.id}
            currentUser={presenceUser}
            fileInputRef={fileInputRef}
            onEditorMount={setEditor}
            onPersistSnapshot={handlePersistSnapshot}
            onPresencesChange={setPresences}
            snapshot={boardData.snapshot}
          />
        </PanelBody>
      </Panel>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload image to whiteboard"
      />
    </div>
  )
}

export function WhiteboardPageClient(props: WhiteboardPageClientProps) {
  const organizationPath = useOrganizationPath()
  const backHref = organizationPath(`/classes/${props.initialData.board.classId}`)

  return (
    <OfflineRouteGuard
      title="Whiteboard unavailable offline"
      description="Reconnect to collaborate and save whiteboard changes."
      backHref={backHref}
      backLabel="Back to class"
    >
      <WhiteboardQueryClientProvider>
        <WhiteboardPageClientInner {...props} backHref={backHref} />
      </WhiteboardQueryClientProvider>
    </OfflineRouteGuard>
  )
}
