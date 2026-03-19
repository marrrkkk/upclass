import {
  convertToExcalidrawElements,
  serializeAsJSON,
} from "@excalidraw/excalidraw"
import type { BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types"
import type {
  ExcalidrawElement,
  FileId,
} from "@excalidraw/excalidraw/element/types"
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform"

import type { WhiteboardSnapshotDocument } from "@/whiteboard/types"

type LegacyElement = {
  id: string
  type: string
  data?: Record<string, unknown>
}

type TldrawRecord = {
  id?: string
  typeName?: string
  type?: string
  x?: number
  y?: number
  rotation?: number
  props?: Record<string, unknown>
}

type TldrawSnapshotLike = {
  store?: Record<string, unknown>
}

const COLOR_MAP: Record<string, string> = {
  black: "#111827",
  blue: "#2563eb",
  green: "#16a34a",
  grey: "#6b7280",
  orange: "#ea580c",
  red: "#dc2626",
  violet: "#7c3aed",
  yellow: "#ca8a04",
  "light-blue": "#93c5fd",
  "light-green": "#86efac",
  "light-red": "#fca5a5",
  "light-violet": "#c4b5fd",
}

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function parseLegacyData(legacyData: string | null) {
  if (!legacyData) return []

  try {
    const parsed = JSON.parse(legacyData)
    return Array.isArray(parsed) ? (parsed as LegacyElement[]) : []
  } catch {
    return []
  }
}

function normalizeColor(value: unknown, fallback: string) {
  if (typeof value !== "string" || value.length === 0) {
    return fallback
  }

  return COLOR_MAP[value] ?? value
}

function clampNumber(value: unknown, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function buildSceneDocument(
  elements: readonly ExcalidrawElement[],
  files: BinaryFiles = {},
): WhiteboardSnapshotDocument {
  return JSON.parse(
    serializeAsJSON(elements, { viewBackgroundColor: "#ffffff" }, files, "database"),
  ) as WhiteboardSnapshotDocument
}

function convertLegacyElements(legacyData: string | null): WhiteboardSnapshotDocument | null {
  const legacyElements = parseLegacyData(legacyData)
  if (legacyElements.length === 0) return null

  const skeletons: ExcalidrawElementSkeleton[] = []
  const files: BinaryFiles = {}

  for (const element of legacyElements) {
    const data = element.data ?? {}
    const x = clampNumber(data.x, 0)
    const y = clampNumber(data.y, 0)
    const width = Math.abs(clampNumber(data.width, 160)) || 160
    const height = Math.abs(clampNumber(data.height, 120)) || 120

    if (element.type === "rectangle") {
      skeletons.push({ type: "rectangle", x, y, width, height })
      continue
    }

    if (element.type === "circle") {
      skeletons.push({ type: "ellipse", x, y, width, height })
      continue
    }

    if (element.type === "text" && typeof data.text === "string") {
      skeletons.push({ type: "text", x, y, text: data.text })
      continue
    }

    if (element.type === "image") {
      const url = typeof data.url === "string" ? data.url : null
      if (!url?.startsWith("data:")) continue

      const fileId = element.id as FileId
      const mimeType = url.slice(5, url.indexOf(";")) as BinaryFileData["mimeType"]

      files[fileId] = {
        id: fileId,
        dataURL: url as BinaryFileData["dataURL"],
        mimeType,
        created: Date.now(),
        lastRetrieved: Date.now(),
      }

      skeletons.push({ type: "image", x, y, width, height, fileId })
    }
  }

  if (skeletons.length === 0) return null
  return buildSceneDocument(convertToExcalidrawElements(skeletons), files)
}

function convertTldrawSnapshot(document: unknown): WhiteboardSnapshotDocument | null {
  const snapshot = asObject(document) as TldrawSnapshotLike | null
  const store = snapshot?.store
  if (!store || typeof store !== "object") {
    return null
  }

  const records = Object.values(store).map((entry) => asObject(entry)).filter(Boolean) as TldrawRecord[]
  if (records.length === 0) {
    return null
  }

  const assetsById = new Map<string, TldrawRecord>()
  for (const record of records) {
    if (record.typeName === "asset") {
      assetsById.set(String(record.id), record)
    }
  }

  const skeletons: ExcalidrawElementSkeleton[] = []
  const files: BinaryFiles = {}

  for (const record of records) {
    if (record.typeName !== "shape") continue

    const props = record.props ?? {}
    const x = clampNumber(record.x, 0)
    const y = clampNumber(record.y, 0)
    const width = Math.abs(clampNumber(props.w, 160)) || 160
    const height = Math.abs(clampNumber(props.h, 120)) || 120
    const common = {
      x,
      y,
      width,
      height,
      angle: clampNumber(record.rotation, 0),
      strokeColor: normalizeColor(props.color, "#111827"),
      backgroundColor: normalizeColor(props.fill, "transparent"),
      opacity: Math.max(10, Math.min(100, Math.round(clampNumber(props.opacity, 1) * 100))),
    }

    if (record.type === "geo") {
      const geo = typeof props.geo === "string" ? props.geo : "rectangle"
      skeletons.push({ type: geo === "ellipse" ? "ellipse" : "rectangle", ...common })
      continue
    }

    if (record.type === "text") {
      const text = typeof props.text === "string" ? props.text : ""
      if (!text) continue
      skeletons.push({ type: "text", x, y, text, strokeColor: common.strokeColor })
      continue
    }

    if (record.type === "note") {
      skeletons.push({
        type: "rectangle",
        ...common,
        backgroundColor: "#fef08a",
        fillStyle: "solid",
        label: {
          text: typeof props.text === "string" ? props.text : "Sticky note",
        },
      })
      continue
    }

    if (record.type === "line") {
      const points = Array.isArray(props.points)
        ? props.points
            .map((point) => asObject(point))
            .filter(Boolean)
            .map((point) => [clampNumber(point?.x, 0), clampNumber(point?.y, 0)] as const)
        : []
      skeletons.push({ type: "line", x, y, points })
      continue
    }

    if (record.type === "arrow") {
      const points = Array.isArray(props.points)
        ? props.points
            .map((point) => asObject(point))
            .filter(Boolean)
            .map((point) => [clampNumber(point?.x, 0), clampNumber(point?.y, 0)] as const)
        : []
      skeletons.push({ type: "arrow", x, y, points })
      continue
    }

    if (record.type === "image") {
      const asset = assetsById.get(String(props.assetId))
      const assetProps = asset?.props ?? {}
      const src = typeof assetProps.src === "string" ? assetProps.src : null
      if (!src?.startsWith("data:")) continue

      const fileId = String(asset?.id ?? record.id) as FileId
      const mimeType = src.slice(5, src.indexOf(";")) as BinaryFileData["mimeType"]

      files[fileId] = {
        id: fileId,
        dataURL: src as BinaryFileData["dataURL"],
        mimeType,
        created: Date.now(),
        lastRetrieved: Date.now(),
      }

      skeletons.push({ type: "image", x, y, width, height, fileId })
    }
  }

  if (skeletons.length === 0) {
    return null
  }

  return buildSceneDocument(convertToExcalidrawElements(skeletons), files)
}

export function resolveWhiteboardSnapshotDocument(input: {
  document: unknown
  legacyData?: string | null
}): WhiteboardSnapshotDocument | null {
  const document = asObject(input.document)

  if (
    document?.type === "excalidraw" &&
    Array.isArray(document.elements) &&
    (document.version === undefined || typeof document.version === "number")
  ) {
    return document as unknown as WhiteboardSnapshotDocument
  }

  return convertTldrawSnapshot(document) ?? convertLegacyElements(input.legacyData ?? null)
}
