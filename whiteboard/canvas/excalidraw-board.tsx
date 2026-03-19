"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  Excalidraw,
  serializeAsJSON,
} from "@excalidraw/excalidraw"
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from "@excalidraw/excalidraw/types"
import type { FileId, OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types"
import "@excalidraw/excalidraw/index.css"

import { cn } from "@/lib/utils"
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
import { resolveWhiteboardSnapshotDocument } from "@/whiteboard/utils/legacy"

const BOARD_BOUNDS = {
  x: 0,
  y: 0,
  width: 3200,
  height: 1800,
  padding: 160,
} as const

const KEEPALIVE_BODY_LIMIT = 60_000
const CURSOR_SMOOTHING = 0.58
const CURSOR_SETTLE_DISTANCE = 0.2
const CURSOR_SNAP_DISTANCE = 18

type ElementVersionState = Record<
  string,
  {
    version: number
    versionNonce: number
    updated: number
    isDeleted: boolean
  }
>

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Failed to read image"))
    reader.readAsDataURL(file)
  })
}

function getImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.width, height: image.height })
    image.onerror = () => reject(new Error("Failed to measure image"))
    image.src = URL.createObjectURL(file)
  })
}

function sortElements(elements: readonly OrderedExcalidrawElement[]) {
  return [...elements].sort((left, right) => left.index.localeCompare(right.index))
}

function getElementVersionState(elements: readonly OrderedExcalidrawElement[]): ElementVersionState {
  return Object.fromEntries(
    elements.map((element) => [
      element.id,
      {
        version: element.version,
        versionNonce: element.versionNonce,
        updated: element.updated,
        isDeleted: element.isDeleted,
      },
    ]),
  )
}

function mergeElements(
  current: readonly OrderedExcalidrawElement[],
  incoming: readonly OrderedExcalidrawElement[],
) {
  const next = new Map(current.map((element) => [element.id, element]))

  for (const remote of incoming) {
    const local = next.get(remote.id)
    if (!local || remote.version > local.version || remote.updated > local.updated) {
      next.set(remote.id, remote)
    }
  }

  return sortElements(Array.from(next.values()))
}

function getChangedElements(
  previous: ElementVersionState,
  current: readonly OrderedExcalidrawElement[],
) {
  return current.filter((element) => {
    const prior = previous[element.id]
    return (
      !prior ||
      prior.version !== element.version ||
      prior.versionNonce !== element.versionNonce ||
      prior.updated !== element.updated ||
      prior.isDeleted !== element.isDeleted
    )
  })
}

function clampCamera(
  scrollX: number,
  scrollY: number,
  zoomValue: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const minScrollX = viewportWidth / zoomValue - (BOARD_BOUNDS.x + BOARD_BOUNDS.width) - BOARD_BOUNDS.padding
  const maxScrollX = -BOARD_BOUNDS.x + BOARD_BOUNDS.padding
  const minScrollY = viewportHeight / zoomValue - (BOARD_BOUNDS.y + BOARD_BOUNDS.height) - BOARD_BOUNDS.padding
  const maxScrollY = -BOARD_BOUNDS.y + BOARD_BOUNDS.padding

  return {
    scrollX: clamp(scrollX, minScrollX, maxScrollX),
    scrollY: clamp(scrollY, minScrollY, maxScrollY),
  }
}

function centerCamera(viewportWidth: number, viewportHeight: number) {
  return {
    scrollX: viewportWidth / 2 - (BOARD_BOUNDS.x + BOARD_BOUNDS.width / 2),
    scrollY: viewportHeight / 2 - (BOARD_BOUNDS.y + BOARD_BOUNDS.height / 2),
  }
}

function buildCollaborators(presences: Record<string, WhiteboardPresence>) {
  const collaborators = new Map<SocketId, Collaborator>()

  for (const presence of Object.values(presences)) {
    collaborators.set(presence.user.id as SocketId, {
      id: presence.user.id,
      socketId: presence.user.id as SocketId,
      username: presence.user.name,
      avatarUrl: presence.user.image ?? undefined,
      selectedElementIds: presence.selectedShapeIds.reduce<Record<string, true>>((accumulator, id) => {
        accumulator[id] = true
        return accumulator
      }, {}),
      color: {
        background: presence.user.color,
        stroke: presence.user.color,
      },
      pointer: presence.cursor
        ? {
            x: presence.cursor.x,
            y: presence.cursor.y,
            tool: "pointer",
          }
        : undefined,
    })
  }

  return collaborators
}

function buildDocument(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
) {
  return JSON.parse(serializeAsJSON(elements, appState, files, "database")) as WhiteboardSnapshotDocument
}

type ExcalidrawBoardProps = {
  boardId: string
  currentUser: WhiteboardPresenceUser
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onEditorMount?: (api: ExcalidrawImperativeAPI | null) => void
  onPersistSnapshot: (document: WhiteboardSnapshotDocument, version: number) => Promise<number>
  onPresencesChange?: (presences: Record<string, WhiteboardPresence>) => void
  snapshot: WhiteboardSnapshot
}

export function ExcalidrawBoard({
  boardId,
  currentUser,
  fileInputRef,
  onEditorMount,
  onPersistSnapshot,
  onPresencesChange,
  snapshot,
}: ExcalidrawBoardProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const setIsUploading = useWhiteboardUiStore((state) => state.setIsUploading)
  const setSaveStatus = useWhiteboardUiStore((state) => state.setSaveStatus)
  const clientIdRef = useRef(crypto.randomUUID())
  const saveTimeoutRef = useRef<number | null>(null)
  const loadedVersionRef = useRef<number | null>(null)
  const latestSnapshotRef = useRef(snapshot)
  const previousElementStateRef = useRef<ElementVersionState>({})
  const latestSceneRef = useRef<{
    elements: readonly OrderedExcalidrawElement[]
    appState: AppState
    files: BinaryFiles
  } | null>(null)
  const isApplyingRemoteRef = useRef(false)
  const isClampingScrollRef = useRef(false)
  const didInitializeViewportRef = useRef(false)
  const animatedPresencesRef = useRef<Record<string, WhiteboardPresence>>({})

  const initialDocument = useMemo(
    () =>
      resolveWhiteboardSnapshotDocument({
        document: snapshot.document,
        legacyData: snapshot.legacyData,
      }),
    [snapshot.document, snapshot.legacyData],
  )

  const persistSnapshot = useCallback(
    async (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
      options?: { keepalive?: boolean },
    ) => {
      const nextDocument = buildDocument(elements, appState, files)

      if (options?.keepalive) {
        const body = JSON.stringify({
          document: nextDocument,
          version: latestSnapshotRef.current.version,
        })

        if (body.length > KEEPALIVE_BODY_LIMIT) {
          return latestSnapshotRef.current.version
        }

        try {
          const response = await fetch(`/api/whiteboards/${boardId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body,
            keepalive: true,
          })

          if (!response.ok) {
            return latestSnapshotRef.current.version
          }

          const result = (await response.json()) as { snapshot: { version: number } }
          loadedVersionRef.current = result.snapshot.version
          latestSnapshotRef.current = {
            ...latestSnapshotRef.current,
            document: nextDocument,
            version: result.snapshot.version,
          }
          return result.snapshot.version
        } catch {
          return latestSnapshotRef.current.version
        }
      }

      const nextVersion = await onPersistSnapshot(nextDocument, latestSnapshotRef.current.version)
      loadedVersionRef.current = nextVersion
      latestSnapshotRef.current = {
        ...latestSnapshotRef.current,
        document: nextDocument,
        version: nextVersion,
      }
      return nextVersion
    },
    [boardId, onPersistSnapshot],
  )

  useEffect(() => {
    latestSnapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    if (!api || didInitializeViewportRef.current) return

    didInitializeViewportRef.current = true
    const appState = api.getAppState()
    const centered = centerCamera(appState.width, appState.height)
    api.updateScene({
      appState: {
        viewBackgroundColor: "#eef2ff",
        scrollX: centered.scrollX,
        scrollY: centered.scrollY,
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    })
  }, [api])

  const handleRemoteShapeEvent = useCallback(
    (event: WhiteboardShapeUpdateEvent) => {
      if (!api || event.elements.length === 0) {
        return
      }

      const mergedElements = mergeElements(api.getSceneElementsIncludingDeleted(), event.elements)
      isApplyingRemoteRef.current = true
      api.updateScene({
        elements: mergedElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      })
      previousElementStateRef.current = getElementVersionState(mergedElements)
    },
    [api],
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
    if (!api) return

    const targetPresences = presences
    let frameId: number | null = null

    const tick = () => {
      const nextAnimated: Record<string, WhiteboardPresence> = {}
      let hasMotion = false

      for (const [userId, targetPresence] of Object.entries(targetPresences)) {
        const currentPresence = animatedPresencesRef.current[userId]

        if (!targetPresence.cursor) {
          nextAnimated[userId] = targetPresence
          continue
        }

        if (!currentPresence?.cursor) {
          nextAnimated[userId] = targetPresence
          continue
        }

        const dx = targetPresence.cursor.x - currentPresence.cursor.x
        const dy = targetPresence.cursor.y - currentPresence.cursor.y
        const distance = Math.hypot(dx, dy)

        if (distance <= CURSOR_SETTLE_DISTANCE || distance >= CURSOR_SNAP_DISTANCE) {
          nextAnimated[userId] = targetPresence
          continue
        }

        hasMotion = true
        nextAnimated[userId] = {
          ...targetPresence,
          cursor: {
            x: currentPresence.cursor.x + dx * CURSOR_SMOOTHING,
            y: currentPresence.cursor.y + dy * CURSOR_SMOOTHING,
          },
        }
      }

      animatedPresencesRef.current = nextAnimated
      api.updateScene({
        collaborators: buildCollaborators(nextAnimated),
        captureUpdate: CaptureUpdateAction.NEVER,
      })

      if (hasMotion) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    for (const userId of Object.keys(animatedPresencesRef.current)) {
      if (!targetPresences[userId]) {
        delete animatedPresencesRef.current[userId]
      }
    }

    tick()

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [api, presences])

  useEffect(() => {
    if (!api || !initialDocument) return
    if (loadedVersionRef.current === snapshot.version) return

    isApplyingRemoteRef.current = true
    api.updateScene({
      elements: initialDocument.elements,
      captureUpdate: CaptureUpdateAction.NEVER,
    })
    api.addFiles(Object.values(initialDocument.files ?? {}))
    previousElementStateRef.current = getElementVersionState(initialDocument.elements)
    loadedVersionRef.current = snapshot.version
  }, [api, initialDocument, snapshot.version])

  const handleChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      const allElements = api?.getSceneElementsIncludingDeleted() ?? elements
      latestSceneRef.current = { elements: allElements, appState, files }

      updatePresence({
        camera: {
          x: appState.scrollX,
          y: appState.scrollY,
          z: appState.zoom.value,
        },
        selectedShapeIds: Object.keys(appState.selectedElementIds),
      })

      if (isApplyingRemoteRef.current) {
        isApplyingRemoteRef.current = false
        previousElementStateRef.current = getElementVersionState(allElements)
        return
      }

      const changedElements = getChangedElements(previousElementStateRef.current, allElements)
      previousElementStateRef.current = getElementVersionState(allElements)

      if (changedElements.length > 0) {
        broadcastShapeEvent({
          type: "shape_update",
          boardId,
          actorId: currentUser.id,
          clientId: clientIdRef.current,
          elements: changedElements,
          sentAt: new Date().toISOString(),
        })
      }

      setSaveStatus(navigator.onLine ? "saving" : "offline")

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          await persistSnapshot(allElements, appState, files)
          setSaveStatus("saved")
        } catch (error) {
          console.error("Failed to persist whiteboard snapshot", error)
          setSaveStatus("error")
        }
      }, 1200)
    },
    [api, boardId, broadcastShapeEvent, currentUser.id, persistSnapshot, setSaveStatus, updatePresence],
  )

  const handlePointerUpdate = useCallback(
    ({ pointer }: { pointer: { x: number; y: number; tool: "pointer" | "laser" } }) => {
      updatePresence({
        cursor: {
          x: pointer.x,
          y: pointer.y,
        },
      })
    },
    [updatePresence],
  )

  const handlePointerLeave = useCallback(() => {
    updatePresence({ cursor: null })
  }, [updatePresence])

  const handleImageUpload = useCallback(
    async (file: File | null) => {
      if (!file || !api) return

      setIsUploading(true)

      try {
        const [{ width, height }, dataUrl, upload] = await Promise.all([
          getImageSize(file),
          readFileAsDataUrl(file),
          uploadWhiteboardImage(boardId, file),
        ])

        const fileId = crypto.randomUUID() as FileId
        const nextFile: BinaryFileData = {
          id: fileId,
          dataURL: dataUrl as BinaryFileData["dataURL"],
          mimeType: (file.type || "image/png") as BinaryFileData["mimeType"],
          created: Date.now(),
          lastRetrieved: Date.now(),
        }

        api.addFiles([nextFile])

        const appState = api.getAppState()
        const zoom = appState.zoom.value || 1
        const sceneCenterX = -appState.scrollX + appState.width / (2 * zoom)
        const sceneCenterY = -appState.scrollY + appState.height / (2 * zoom)
        const targetWidth = Math.min(480, width)
        const targetHeight = Math.max(80, Math.round((height / width) * targetWidth))
        const x = clamp(sceneCenterX - targetWidth / 2, BOARD_BOUNDS.x, BOARD_BOUNDS.width - targetWidth)
        const y = clamp(sceneCenterY - targetHeight / 2, BOARD_BOUNDS.y, BOARD_BOUNDS.height - targetHeight)

        const [nextElement] = convertToExcalidrawElements([
          {
            type: "image",
            x,
            y,
            width: targetWidth,
            height: targetHeight,
            fileId,
            customData: {
              storageBucket: upload.bucket,
              storagePath: upload.path,
              publicUrl: upload.publicUrl,
            },
          },
        ])

        const nextElements = sortElements([...api.getSceneElementsIncludingDeleted(), nextElement])
        api.updateScene({ elements: nextElements })
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
    [api, boardId, fileInputRef, setIsUploading, setSaveStatus],
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
    onEditorMount?.(api)

    return () => {
      onEditorMount?.(null)
    }
  }, [api, onEditorMount])

  useEffect(() => {
    const flushLatestScene = () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      const latestScene = latestSceneRef.current
      if (!latestScene) return

      void persistSnapshot(latestScene.elements, latestScene.appState, latestScene.files, {
        keepalive: true,
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushLatestScene()
      }
    }

    window.addEventListener("pagehide", flushLatestScene)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("pagehide", flushLatestScene)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [persistSnapshot])

  return (
    <div
      className={cn("relative h-[calc(100vh-18rem)] min-h-[70vh] overflow-hidden rounded-2xl border bg-white")}
      onPointerLeave={handlePointerLeave}
    >
      <div className="pointer-events-none absolute inset-6 rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.12)]" />
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={
          initialDocument
            ? {
                elements: initialDocument.elements,
                files: initialDocument.files,
                scrollToContent: false,
              }
            : {
                appState: {
                  viewBackgroundColor: "#eef2ff",
                },
                scrollToContent: false,
              }
        }
        isCollaborating
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        onScrollChange={(scrollX, scrollY, zoom) => {
          if (!api || isClampingScrollRef.current) return

          const appState = api.getAppState()
          const clamped = clampCamera(scrollX, scrollY, zoom.value, appState.width, appState.height)
          if (clamped.scrollX === scrollX && clamped.scrollY === scrollY) {
            return
          }

          isClampingScrollRef.current = true
          api.updateScene({
            appState: {
              scrollX: clamped.scrollX,
              scrollY: clamped.scrollY,
            },
            captureUpdate: CaptureUpdateAction.NEVER,
          })
          window.requestAnimationFrame(() => {
            isClampingScrollRef.current = false
          })
        }}
      />
    </div>
  )
}
