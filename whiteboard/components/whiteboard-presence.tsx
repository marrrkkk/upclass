"use client"

import type { Editor } from "tldraw"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { WhiteboardPresence } from "@/whiteboard/types"
import { getInitials } from "@/whiteboard/utils/presence"

type WhiteboardPresenceProps = {
  editor: Editor | null
  presences: Record<string, WhiteboardPresence>
}

export function WhiteboardPresenceOverlay({ editor, presences }: WhiteboardPresenceProps) {
  if (!editor) return null

  const viewport = editor.getViewportScreenBounds()

  return (
    <>
      {Object.values(presences).map((presence) => {
        if (!presence.cursor) return null

        const point = editor.pageToScreen(presence.cursor)

        return (
          <div
            key={presence.user.id}
            className="pointer-events-none absolute z-20"
            style={{
              left: point.x - viewport.x,
              top: point.y - viewport.y,
              transform: "translate(8px, 8px)",
            }}
          >
            <div className="flex items-center gap-2 rounded-full border bg-background/95 px-2 py-1 shadow-sm backdrop-blur">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: presence.user.color }}
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{presence.user.name}</span>
              {presence.selectedShapeIds.length > 0 ? (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {presence.selectedShapeIds.length}
                </Badge>
              ) : null}
            </div>
          </div>
        )
      })}
    </>
  )
}

export function WhiteboardPresenceList({ presences }: { presences: Record<string, WhiteboardPresence> }) {
  const collaborators = Object.values(presences)

  return (
    <div className="flex items-center gap-2">
      {collaborators.length === 0 ? (
        <Badge variant="secondary">Solo</Badge>
      ) : (
        collaborators.map((presence) => (
          <div
            key={presence.user.id}
            className={cn("flex items-center gap-2 rounded-full border bg-background px-2 py-1 shadow-sm")}
          >
            <Avatar className="size-6">
              <AvatarImage src={presence.user.image || undefined} alt={presence.user.name} />
              <AvatarFallback
                className="text-[10px] text-white"
                style={{ backgroundColor: presence.user.color }}
              >
                {getInitials(presence.user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-28 truncate text-xs font-medium">{presence.user.name}</span>
          </div>
        ))
      )}
    </div>
  )
}
