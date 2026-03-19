"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AssetRecordType,
  createShapeId,
  createTLStore,
  getSnapshot,
  loadSnapshot,
  Tldraw,
  type Editor,
} from "tldraw"
import "tldraw/tldraw.css"

import { cn } from "@/lib/utils"
import { WhiteboardPresenceOverlay } from "@/whiteboard/components/whiteboard-presence"
import { uploadWhiteboardImage } from "@/whiteboard/persistence/storage"
import { useWhiteboardRealtime } from "@/whiteboard/realtime/use-whiteboard-realtime"
import { useWhiteboardUiStore } from "@/whiteboard/state/use-whiteboard-ui-store"
import type {
  WhiteboardPresence,
  WhiteboardPresenceUser,
  WhiteboardShapeUpdateEvent,
  WhiteboardSnapshot,
  WhiteboardSnapshotDocument,
} from "@/whiteboard/types"
import { importLegacyWhiteboardData } from "@/whiteboard/utils/legacy"
import { hasRecordsDiff, serializeRecordsDiff } from "@/whiteboard/utils/realtime"

const BOARD_BOUNDS = {
  x: -1600,
  y: -900,
  w: 3200,
  h: 1800,
} as const

const CAMERA_OPTIONS = {
  constraints: {
    bounds: BOARD_BOUNDS,
    padding: { x: 96, y: 96 },
    origin: { x: 0.5, y: 0.5 },
    initialZoom: "fit-x-100",
    baseZoom: "default",
    behavior: "contain",
  },
} as const

type TldrawBoardProps = {
  boardId: string
  currentUser: WhiteboardPresenceUser
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onEditorMount?: (editor: Editor | null) => void
  onPersistSnapshot: (document: WhiteboardSnapshotDocument, version: number) => Promise<number>
  onPresencesChange?: (presences: Record<string, WhiteboardPresence>) => void
  snapshot: WhiteboardSnapshot
}

function getImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.width, height: image.height })
    image.onerror = () => reject(new Error("Failed to measure image"))
    image.src = URL.createObjectURL(file)
  })
}

function clampToBoard(x: number, y: number) {
  return {
    x: Math.min(Math.max(x, BOARD_BOUNDS.x), BOARD_BOUNDS.x + BOARD_BOUNDS.w),
    y: Math.min(Math.max(y, BOARD_BOUNDS.y), BOARD_BOUNDS.y + BOARD_BOUNDS.h),
  }
}

export function TldrawBoard({
  boardId,
  currentUser,
  fileInputRef,
  onEditorMount,
  onPersistSnapshot,
  onPresencesChange,
  snapshot,
}: TldrawBoardProps) {
  const store = useMemo(() => createTLStore(), [])
  const [editor, setEditor] = useState<Editor | null>(null)
  const [viewportVersion, setViewportVersion] = useState(0)
  const setIsUploading = useWhiteboardUiStore((state) => state.setIsUploading)
  const setSaveStatus = useWhiteboardUiStore((state) => state.setSaveStatus)
  const loadedVersionRef = useRef<number | null>(null)
  const importedLegacyRef = useRef(false)
  const clientIdRef = useRef(crypto.randomUUID())
  const saveTimeoutRef = useRef<number | null>(null)
  const latestSnapshotRef = useRef(snapshot)

  useEffect(() => {
    latestSnapshotRef.current = snapshot
  }, [snapshot])

  const handleRemoteShapeEvent = useCallback(
    (event: WhiteboardShapeUpdateEvent) => {
      store.mergeRemoteChanges(() => {
        store.applyDiff(event.diff as never)
      })
    },
    [store],
  )

  const { presences, broadcastShapeEvent, updatePresence } = useWhiteboardRealtime({
    boardId,
    clientId: clientIdRef.current,
    currentUser,
    onRemoteShapeEvent: handleRemoteShapeEvent,
  })

  useEffect(() => {
    onPresencesChange?.(presences)
  }, [onPresencesChange, presences])

  useEffect(() => {
    if (!editor) return

    if (snapshot.document && loadedVersionRef.current !== snapshot.version) {
      loadSnapshot(store, snapshot.document)
      loadedVersionRef.current = snapshot.version
      return
    }

    if (!snapshot.document && !importedLegacyRef.current && snapshot.legacyData) {
      importedLegacyRef.current = true
      void importLegacyWhiteboardData(editor, snapshot.legacyData)
    }
  }, [editor, snapshot.document, snapshot.legacyData, snapshot.version, store])

  useEffect(() => {
    const unsubscribeDocument = store.listen(
      ({ changes }) => {
        const diff = serializeRecordsDiff(changes)
        if (hasRecordsDiff(diff)) {
          broadcastShapeEvent({
            type: "shape_update",
            boardId,
            actorId: currentUser.id,
            clientId: clientIdRef.current,
            diff,
            sentAt: new Date().toISOString(),
          })
        }

        const nextSnapshot = getSnapshot(store)
        setSaveStatus(navigator.onLine ? "saving" : "offline")

        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = window.setTimeout(async () => {
          try {
            const nextVersion = await onPersistSnapshot(nextSnapshot, latestSnapshotRef.current.version)
            loadedVersionRef.current = nextVersion
            latestSnapshotRef.current = {
              ...latestSnapshotRef.current,
              document: nextSnapshot,
              version: nextVersion,
            }
            setSaveStatus("saved")
          } catch (error) {
            console.error("Failed to persist whiteboard snapshot", error)
            setSaveStatus("error")
          }
        }, 1200)
      },
      { source: "user", scope: "document" },
    )

    const unsubscribeSession = store.listen(
      () => {
        setViewportVersion((value) => value + 1)
        if (!editor) return

        const camera = editor.getCamera()
        updatePresence({
          camera: { x: camera.x, y: camera.y, z: camera.z },
          selectedShapeIds: editor.getSelectedShapeIds(),
        })
      },
      { scope: "session", source: "all" },
    )

    return () => {
      unsubscribeDocument()
      unsubscribeSession()
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [boardId, broadcastShapeEvent, currentUser.id, editor, onPersistSnapshot, setSaveStatus, store, updatePresence])

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!editor) return

      const nextPoint = editor.screenToPage({ x: event.clientX, y: event.clientY })
      const clampedPoint = clampToBoard(nextPoint.x, nextPoint.y)
      updatePresence({ cursor: clampedPoint })
    },
    [editor, updatePresence],
  )

  const handlePointerLeave = useCallback(() => {
    updatePresence({ cursor: null })
  }, [updatePresence])

  const handleImageUpload = useCallback(
    async (file: File | null) => {
      if (!file || !editor) return

      setIsUploading(true)

      try {
        const [{ width, height }, upload] = await Promise.all([
          getImageSize(file),
          uploadWhiteboardImage(boardId, file),
        ])

        const viewport = editor.getViewportPageBounds()
        const targetWidth = Math.min(480, width)
        const targetHeight = Math.max(80, Math.round((height / width) * targetWidth))
        const assetId = AssetRecordType.createId()
        const targetPosition = clampToBoard(
          viewport.center.x - targetWidth / 2,
          viewport.center.y - targetHeight / 2,
        )

        editor.createAssets([
          AssetRecordType.create({
            id: assetId,
            type: "image",
            props: {
              name: file.name,
              src: upload.publicUrl,
              w: width,
              h: height,
              mimeType: file.type || null,
              isAnimated: file.type === "image/gif",
              fileSize: file.size,
            },
            meta: {
              bucket: upload.bucket,
              path: upload.path,
            },
          }),
        ])

        editor.createShape({
          id: createShapeId(),
          type: "image",
          x: targetPosition.x,
          y: targetPosition.y,
          props: {
            w: targetWidth,
            h: targetHeight,
            assetId,
            crop: null,
            playing: true,
            flipX: false,
            flipY: false,
            altText: file.name,
          },
        })
      } catch (error) {
        console.error("Failed to upload whiteboard image", error)
        setSaveStatus("error")
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        setIsUploading(false)
      }
    },
    [boardId, editor, fileInputRef, setIsUploading, setSaveStatus],
  )

  useEffect(() => {
    const input = fileInputRef.current
    if (!input) return

    input.onchange = () => {
      void handleImageUpload(input.files?.[0] ?? null)
    }

    return () => {
      input.onchange = null
    }
  }, [fileInputRef, handleImageUpload])

  useEffect(() => {
    onEditorMount?.(editor)

    return () => {
      onEditorMount?.(null)
    }
  }, [editor, onEditorMount])

  return (
    <div
      className={cn("relative h-[calc(100vh-18rem)] min-h-[70vh] overflow-hidden rounded-2xl border bg-white")}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      data-viewport-version={viewportVersion}
    >
      <Tldraw
        store={store}
        hideUi
        inferDarkMode
        options={{ camera: CAMERA_OPTIONS }}
        onMount={(nextEditor) => {
          setEditor(nextEditor)
          nextEditor.setCurrentTool("select")
          nextEditor.setCameraOptions(CAMERA_OPTIONS)
          nextEditor.setCamera(nextEditor.getCamera(), { reset: true, immediate: true, force: true })
        }}
      />
      <WhiteboardPresenceOverlay editor={editor} presences={presences} />
    </div>
  )
}
