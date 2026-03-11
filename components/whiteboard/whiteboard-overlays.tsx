"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/components/whiteboard/whiteboard-utils"
import type { CursorData, WhiteboardPoint } from "@/types/whiteboard"

type WhiteboardOverlaysProps = {
  color: string
  cursors: Map<string, CursorData>
  onCancelText: () => void
  onSubmitText: () => void
  onTextChange: (value: string) => void
  onTextFontSizeChange: (value: number) => void
  textFontSize: number
  textInput: WhiteboardPoint | null
  textValue: string
}

export function WhiteboardOverlays({
  color,
  cursors,
  onCancelText,
  onSubmitText,
  onTextChange,
  onTextFontSizeChange,
  textFontSize,
  textInput,
  textValue,
}: WhiteboardOverlaysProps) {
  return (
    <>
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-10"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: "translate(-8px, -8px)",
          }}
        >
          <Avatar className="h-4 w-4 border-2 border-white shadow-lg">
            <AvatarImage src={cursor.user.image || undefined} alt={cursor.user.name} />
            <AvatarFallback className="text-[8px] bg-blue-600 text-white">
              {getInitials(cursor.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {cursor.user.name}
          </div>
        </div>
      ))}

      {textInput && (
        <div className="absolute z-20 flex flex-col gap-2" style={{ left: textInput.x, top: textInput.y }}>
          <input
            type="text"
            value={textValue}
            onChange={(event) => onTextChange(event.target.value)}
            onBlur={onSubmitText}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSubmitText()
              } else if (event.key === "Escape") {
                onCancelText()
              }
            }}
            autoFocus
            className="px-2 py-1 border rounded bg-white"
            style={{ color, fontSize: textFontSize }}
          />
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded p-2 border">
            <label className="text-xs text-muted-foreground">Font Size:</label>
            <input
              type="range"
              min="12"
              max="100"
              value={textFontSize}
              onChange={(event) => onTextFontSizeChange(Number(event.target.value))}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">{textFontSize}px</span>
          </div>
        </div>
      )}
    </>
  )
}
