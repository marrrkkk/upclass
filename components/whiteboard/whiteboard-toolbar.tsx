"use client"

import type { RefObject } from "react"
import {
  ArrowRight,
  Circle,
  Eraser,
  Image as ImageIcon,
  Maximize,
  Minimize,
  Minus,
  PenTool,
  Square,
  Trash2,
  Type,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { isStrokeTool } from "@/components/whiteboard/whiteboard-utils"
import type { WhiteboardTool } from "@/types/whiteboard"

type WhiteboardToolbarProps = {
  classColor: string
  className: string
  color: string
  fileInputRef: RefObject<HTMLInputElement | null>
  isFullscreen: boolean
  lineWidth: number
  onClear: () => void
  onColorChange: (value: string) => void
  onLineWidthChange: (value: number) => void
  onToggleFullscreen: () => void
  onToolChange: (tool: WhiteboardTool) => void
  tool: WhiteboardTool
}

type ToolButtonConfig = {
  icon: typeof X
  title: string
  tool: WhiteboardTool
}

const TOOL_BUTTONS: ToolButtonConfig[] = [
  { tool: "select", title: "Select", icon: X },
  { tool: "draw", title: "Draw", icon: PenTool },
  { tool: "eraser", title: "Eraser", icon: Eraser },
  { tool: "rectangle", title: "Rectangle", icon: Square },
  { tool: "circle", title: "Circle", icon: Circle },
  { tool: "line", title: "Line", icon: Minus },
  { tool: "arrow", title: "Arrow", icon: ArrowRight },
  { tool: "image", title: "Image", icon: ImageIcon },
  { tool: "text", title: "Text", icon: Type },
]

export function WhiteboardToolbar({
  classColor,
  className,
  color,
  fileInputRef,
  isFullscreen,
  lineWidth,
  onClear,
  onColorChange,
  onLineWidthChange,
  onToggleFullscreen,
  onToolChange,
  tool,
}: WhiteboardToolbarProps) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="overflow-x-auto">
        <div className="mb-2 px-1">
          <div className="text-xs font-semibold text-foreground truncate">{className}</div>
          <div className="text-[11px] text-muted-foreground">Whiteboard</div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-max">
          {TOOL_BUTTONS.map(({ icon: Icon, title, tool: nextTool }) => (
            <Button
              key={nextTool}
              variant={tool === nextTool ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onToolChange(nextTool)
                if (nextTool === "image") {
                  fileInputRef.current?.click()
                }
              }}
              style={tool === nextTool ? { backgroundColor: classColor } : {}}
              title={title}
              className="flex-shrink-0"
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          {isStrokeTool(tool) && (
            <>
              <input
                type="color"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="h-8 w-16 rounded border flex-shrink-0"
              />
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(event) => onLineWidthChange(Number(event.target.value))}
                className="w-20 sm:w-24 flex-shrink-0"
              />
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{lineWidth}px</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button variant="outline" size="sm" onClick={onClear} className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToggleFullscreen} className="w-full sm:w-auto">
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
