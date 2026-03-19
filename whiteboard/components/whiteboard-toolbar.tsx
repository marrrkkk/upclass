"use client"

import type { RefObject } from "react"
import {
  ArrowRight,
  Download,
  Hand,
  Image as ImageIcon,
  Layers2,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  StickyNote,
  Type,
  Undo2,
} from "lucide-react"
import type {
  Editor,
  TLDefaultColorStyle,
  TLDefaultDashStyle,
  TLDefaultFillStyle,
  TLDefaultFontStyle,
  TLDefaultSizeStyle,
  TLGeoShapeGeoStyle,
} from "tldraw"
import {
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  DefaultFontStyle,
  DefaultSizeStyle,
  GeoShapeGeoStyle,
} from "@tldraw/tlschema"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useWhiteboardUiStore } from "@/whiteboard/state/use-whiteboard-ui-store"
import type { SaveStatus, WhiteboardTool } from "@/whiteboard/types"

const TOOL_LABELS: Array<{
  icon: typeof MousePointer2
  label: string
  tool: WhiteboardTool
}> = [
  { icon: MousePointer2, label: "Select", tool: "select" },
  { icon: Hand, label: "Pan", tool: "hand" },
  { icon: Pencil, label: "Pencil", tool: "draw" },
  { icon: Square, label: "Rectangle", tool: "rectangle" },
  { icon: Square, label: "Ellipse", tool: "ellipse" },
  { icon: ArrowRight, label: "Line", tool: "line" },
  { icon: ArrowRight, label: "Arrow", tool: "arrow" },
  { icon: Type, label: "Text", tool: "text" },
  { icon: StickyNote, label: "Sticky", tool: "sticky" },
  { icon: ImageIcon, label: "Image", tool: "image" },
] as const

const COLOR_OPTIONS: TLDefaultColorStyle[] = [
  "black",
  "blue",
  "green",
  "grey",
  "light-blue",
  "light-green",
  "light-red",
  "light-violet",
  "orange",
  "red",
  "violet",
  "yellow",
]

const SIZE_OPTIONS: TLDefaultSizeStyle[] = ["s", "m", "l", "xl"]
const FILL_OPTIONS: TLDefaultFillStyle[] = ["none", "semi", "solid", "pattern"]
const DASH_OPTIONS: TLDefaultDashStyle[] = ["solid", "dashed", "dotted", "draw"]
const FONT_OPTIONS: TLDefaultFontStyle[] = ["sans", "serif", "mono", "draw"]

function applyOrQueueStyle<T>(
  editor: Editor,
  style: Parameters<Editor["setStyleForNextShapes"]>[0],
  value: T,
) {
  if (editor.getSelectedShapeIds().length > 0) {
    editor.setStyleForSelectedShapes(style, value)
  }

  editor.setStyleForNextShapes(style, value)
}

function syncEditorTool(editor: Editor, tool: WhiteboardTool) {
  if (tool === "rectangle") {
    applyOrQueueStyle(editor, GeoShapeGeoStyle, "rectangle" satisfies TLGeoShapeGeoStyle)
    editor.setCurrentTool("geo")
    return
  }

  if (tool === "ellipse") {
    applyOrQueueStyle(editor, GeoShapeGeoStyle, "ellipse" satisfies TLGeoShapeGeoStyle)
    editor.setCurrentTool("geo")
    return
  }

  if (tool === "sticky") {
    editor.setCurrentTool("note")
    return
  }

  if (tool === "select") {
    editor.setCurrentTool("select")
    return
  }

  if (tool === "image") {
    editor.setCurrentTool("select")
    return
  }

  editor.setCurrentTool(tool)
}

type WhiteboardToolbarProps = {
  editor: Editor | null
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
          <Button variant="outline" size="sm" onClick={() => editor?.undo()} disabled={!editor}>
            <Undo2 data-icon="inline-start" />
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={() => editor?.redo()} disabled={!editor}>
            <Redo2 data-icon="inline-start" />
            Redo
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!editor}>
                <Layers2 data-icon="inline-start" />
                Arrange
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor?.bringToFront(editor.getSelectedShapeIds())}>
                Bring to front
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.bringForward(editor.getSelectedShapeIds())}>
                Bring forward
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.sendBackward(editor.getSelectedShapeIds())}>
                Send backward
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.sendToBack(editor.getSelectedShapeIds())}>
                Send to back
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.deleteShapes(editor.getSelectedShapeIds())}>
                Delete selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={onExport} disabled={!editor}>
            <Download data-icon="inline-start" />
            Export JSON
          </Button>
          <span className="text-xs text-muted-foreground">Status: {saveStatus}</span>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            defaultValue="blue"
            onValueChange={(value) => {
              if (!editor) return
              applyOrQueueStyle(editor, DefaultColorStyle, value as TLDefaultColorStyle)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            defaultValue="m"
            onValueChange={(value) => {
              if (!editor) return
              applyOrQueueStyle(editor, DefaultSizeStyle, value as TLDefaultSizeStyle)
            }}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            defaultValue="none"
            onValueChange={(value) => {
              if (!editor) return
              applyOrQueueStyle(editor, DefaultFillStyle, value as TLDefaultFillStyle)
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Fill" />
            </SelectTrigger>
            <SelectContent>
              {FILL_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            defaultValue="solid"
            onValueChange={(value) => {
              if (!editor) return
              applyOrQueueStyle(editor, DefaultDashStyle, value as TLDefaultDashStyle)
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Stroke" />
            </SelectTrigger>
            <SelectContent>
              {DASH_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            defaultValue="sans"
            onValueChange={(value) => {
              if (!editor) return
              applyOrQueueStyle(editor, DefaultFontStyle, value as TLDefaultFontStyle)
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <span className="text-xs text-muted-foreground">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              defaultValue="1"
              onChange={(event) => {
                if (!editor) return
                const nextValue = Number(event.target.value)

                if (editor.getSelectedShapeIds().length > 0) {
                  editor.setOpacityForSelectedShapes(nextValue)
                }

                editor.setOpacityForNextShapes(nextValue)
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
