import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types"
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types"

export type WhiteboardBoard = {
  id: string
  classId: string
  title: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export type WhiteboardSnapshotDocument = {
  type: "excalidraw"
  version: number
  source?: string
  elements: readonly OrderedExcalidrawElement[]
  appState?: Partial<AppState> | null
  files?: BinaryFiles
}

export type WhiteboardSnapshot = {
  id: string
  boardId: string
  version: number
  document: WhiteboardSnapshotDocument | null
  legacyData: string | null
  updatedAt: string | null
}

export type WhiteboardPageData = {
  board: WhiteboardBoard
  snapshot: WhiteboardSnapshot
}

export type WhiteboardPresenceUser = {
  id: string
  name: string
  image: string | null
  color: string
}

export type WhiteboardCursor = {
  x: number
  y: number
}

export type WhiteboardCamera = {
  x: number
  y: number
  z: number
}

export type WhiteboardPresence = {
  boardId: string
  user: WhiteboardPresenceUser
  cursor: WhiteboardCursor | null
  camera: WhiteboardCamera | null
  selectedShapeIds: string[]
  joinedAt: string
  lastSeenAt: string
}

export type WhiteboardShapeUpdateEvent = {
  type: "shape_update"
  boardId: string
  actorId: string
  clientId: string
  elements: readonly OrderedExcalidrawElement[]
  sentAt: string
}

export type WhiteboardSnapshotSavedEvent = {
  type: "snapshot_saved"
  boardId: string
  actorId: string
  clientId: string
  version: number
  sentAt: string
}

export type WhiteboardCursorUpdateEvent = {
  type: "cursor_update"
  boardId: string
  actorId: string
  clientId: string
  presence: WhiteboardPresence
  sentAt: string
}

export type WhiteboardUserJoinEvent = {
  type: "user_join"
  boardId: string
  actorId: string
  clientId: string
  presence: WhiteboardPresence
  sentAt: string
}

export type WhiteboardUserLeaveEvent = {
  type: "user_leave"
  boardId: string
  actorId: string
  clientId: string
  presence: Pick<WhiteboardPresence, "boardId" | "user" | "lastSeenAt">
  sentAt: string
}

export type WhiteboardRealtimeEvent =
  | WhiteboardShapeUpdateEvent
  | WhiteboardSnapshotSavedEvent
  | WhiteboardCursorUpdateEvent
  | WhiteboardUserJoinEvent
  | WhiteboardUserLeaveEvent

export type WhiteboardTool =
  | "select"
  | "hand"
  | "draw"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "sticky"
  | "image"

export type SaveStatus = "saved" | "saving" | "error" | "offline" | "conflict"
