"use client"

import type { RefObject } from "react"
import {
  ArrowRight,
  Download,
  Hand,
  Image as ImageIcon,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
} from "lucide-react"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useWhiteboardUiStore } from "@/whiteboard/state/use-whiteboard-ui-store"
import type { SaveStatus, WhiteboardTool } from "@/whiteboard/types"

const TOOL_LABELS: Array<{
  icon: typeof MousePointer2
  label: string
  tool: WhiteboardTool
}> = [
  { icon: MousePointer2, label: "Select", tool: "select" },
  { icon: Hand, label: "Pan", tool: "hand" },
  { icon: Pencil, label: "Draw", tool: "draw" },
  { icon: Square, label: "Rectangle", tool: "rectangle" },
  { icon: Square, label: "Ellipse", tool: "ellipse" },
  { icon: ArrowRight, label: "Line", tool: "line" },
  { icon: ArrowRight, label: "Arrow", tool: "arrow" },
  { icon: Type, label: "Text", tool: "text" },
  { icon: StickyNote, label: "Sticky", tool: "sticky" },
  { icon: ImageIcon, label: "Image", tool: "image" },
] as const

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

type WhiteboardToolbarProps = {
  editor: ExcalidrawImperativeAPI | null
  fileInputRef: RefObject<HTMLInputElement | null>
  isUploading: boolean
  onExport: () => void
  saveStatus: SaveStatus
}

export function WhiteboardToolbar({
  editor,
  fileInputRef,
  isUploading,
  onExport,
  saveStatus,
}: WhiteboardToolbarProps) {
  const activeTool = useWhiteboardUiStore((state) => state.activeTool)
  const setActiveTool = useWhiteboardUiStore((state) => state.setActiveTool)

  const setTool = (tool: WhiteboardTool) => {
    setActiveTool(tool)
    if (!editor) return

    if (tool === "image") {
      fileInputRef.current?.click()
      return
    }

    syncEditorTool(editor, tool)
  }

  return (
    <Card className="border-border/80 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {TOOL_LABELS.map(({ icon: Icon, label, tool }) => (
            <Button
              key={tool}
              variant={activeTool === tool ? "default" : "outline"}
              size="sm"
              onClick={() => setTool(tool)}
              disabled={!editor || (tool === "image" && isUploading)}
            >
              <Icon data-icon="inline-start" />
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport} disabled={!editor}>
            <Download data-icon="inline-start" />
            Export JSON
          </Button>
          <span className="text-xs text-muted-foreground">Status: {saveStatus}</span>
          <span className="text-xs text-muted-foreground">
            Built-in Excalidraw controls handle history, layering, and style editing.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
