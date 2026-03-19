"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { WhiteboardPresence, WhiteboardPresenceUser } from "@/whiteboard/types"
import { getInitials } from "@/whiteboard/utils/presence"

type WhiteboardPresenceListProps = {
  currentUser: WhiteboardPresenceUser
  presences: Record<string, WhiteboardPresence>
}

export function WhiteboardPresenceList({ currentUser, presences }: WhiteboardPresenceListProps) {
  const collaborators = [
    currentUser,
    ...Object.values(presences)
      .map((presence) => presence.user)
      .filter((user) => user.id !== currentUser.id),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {collaborators.map((user) => (
        <div
          key={user.id}
          className={cn("rounded-full border bg-background p-1 shadow-sm")}
          title={user.name}
        >
          <Avatar className="size-8">
            <AvatarImage src={user.image || undefined} alt={user.name} />
            <AvatarFallback
              className="text-[10px] text-white"
              style={{ backgroundColor: user.color }}
            >
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}
    </div>
  )
}
