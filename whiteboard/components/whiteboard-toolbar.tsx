"use client"

import type { RefObject } from "react"
import {
  ArrowRight,
  Circle,
  Download,
  Hand,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Square,
  StickyNote,
  Type,
} from "lucide-react"
import { serializeAsJSON } from "@excalidraw/excalidraw"
import type { ExcalidrawImperativeAPI, NormalizedZoomValue } from "@excalidraw/excalidraw/types"

import { Button } from "@/components/ui/button"
import { useWhiteboardUiStore } from "@/whiteboard/state/use-whiteboard-ui-store"
import type { WhiteboardTool } from "@/whiteboard/types"

const TOOL_LABELS: Array<{
  icon: typeof MousePointer2
  label: string
  tool: WhiteboardTool
}> = [
  { icon: MousePointer2, label: "Select", tool: "select" },
  { icon: Hand, label: "Pan", tool: "hand" },
  { icon: Pencil, label: "Draw", tool: "draw" },
  { icon: Square, label: "Rectangle", tool: "rectangle" },
  { icon: Circle, label: "Ellipse", tool: "ellipse" },
  { icon: Minus, label: "Line", tool: "line" },
  { icon: ArrowRight, label: "Arrow", tool: "arrow" },
  { icon: Type, label: "Text", tool: "text" },
  { icon: StickyNote, label: "Sticky note", tool: "sticky" },
  { icon: ImageIcon, label: "Insert image", tool: "image" },
] as const

const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.25
const ZOOM_MAX = 3

function syncEditorTool(api: ExcalidrawImperativeAPI, tool: WhiteboardTool) {
  if (tool === "sticky") {
    api.updateScene({
      appState: {
        currentItemBackgroundColor: "#fef08a",
        currentItemFillStyle: "solid",
      },
    })
    api.setActiveTool({ type: "rectangle", locked: false })
    return
  }

  if (tool === "select") {
    api.setActiveTool({ type: "selection", locked: false })
    return
  }

  if (tool === "draw") {
    api.setActiveTool({ type: "freedraw", locked: false })
    return
  }

  if (tool === "rectangle" || tool === "ellipse" || tool === "line" || tool === "arrow" || tool === "text") {
    api.setActiveTool({ type: tool, locked: false })
    return
  }

  if (tool === "hand") {
    api.setActiveTool({ type: "hand", locked: false })
  }
}

function downloadSnapshot(api: ExcalidrawImperativeAPI) {
  const json = serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), "local")
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "whiteboard.excalidraw"
  anchor.click()
  URL.revokeObjectURL(url)
}

type WhiteboardToolbarProps = {
  editor: ExcalidrawImperativeAPI | null
  fileInputRef: RefObject<HTMLInputElement | null>
  isUploading: boolean
}

/**
 * Floating icon-only canvas toolbar: azure-filled active tool, gray ghost
 * inactive tools, plus a zoom stepper. Mirrors — and stays in sync with — the
 * Excalidraw editor tool state.
 */
export function WhiteboardToolbar({
  editor,
  fileInputRef,
  isUploading,
}: WhiteboardToolbarProps) {
  const activeTool = useWhiteboardUiStore((state) => state.activeTool)
  const setActiveTool = useWhiteboardUiStore((state) => state.setActiveTool)
  const zoom = useWhiteboardUiStore((state) => state.zoom)

  const setTool = (tool: WhiteboardTool) => {
    setActiveTool(tool)
    if (!editor) return

    if (tool === "image") {
      fileInputRef.current?.click()
      return
    }

    syncEditorTool(editor, tool)
  }

  const applyZoom = (delta: number) => {
    if (!editor) return
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((zoom + delta) * 100) / 100))
    // Clamped and rounded, so the value satisfies the normalized-zoom brand.
    editor.updateScene({ appState: { zoom: { value: next as NormalizedZoomValue } } })
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <div
        role="toolbar"
        aria-label="Whiteboard tools"
        className="flex items-center gap-0.5 rounded-[var(--radius-floating)] border border-hairline bg-card/95 p-1 shadow-e3 backdrop-blur-sm"
      >
        {TOOL_LABELS.map(({ icon: Icon, label, tool }) => (
          <Button
            key={tool}
            variant={activeTool === tool ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => setTool(tool)}
            disabled={!editor || (tool === "image" && isUploading)}
            aria-label={label}
            aria-pressed={activeTool === tool}
            title={label}
          >
            <Icon aria-hidden="true" />
          </Button>
        ))}

        <div className="mx-1 h-5 w-px bg-hairline-strong" aria-hidden="true" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => applyZoom(-ZOOM_STEP)}
          disabled={!editor || zoom <= ZOOM_MIN}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus aria-hidden="true" />
        </Button>
        <span className="min-w-11 text-center type-small tabular-nums select-none text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => applyZoom(ZOOM_STEP)}
          disabled={!editor || zoom >= ZOOM_MAX}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus aria-hidden="true" />
        </Button>

        <div className="mx-1 h-5 w-px bg-hairline-strong" aria-hidden="true" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor && downloadSnapshot(editor)}
          disabled={!editor}
          aria-label="Export whiteboard as JSON"
          title="Export JSON"
        >
          <Download aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
