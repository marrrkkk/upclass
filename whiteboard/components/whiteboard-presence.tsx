"use client"

import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Text } from "@/components/ui/typography"
import type { WhiteboardPresence, WhiteboardPresenceUser } from "@/whiteboard/types"

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
  const visibleCollaborators = collaborators.slice(0, 4)
  const hiddenCount = Math.max(0, collaborators.length - visibleCollaborators.length)
  const presenceSummary = collaborators.length === 1
    ? "Only you"
    : `${collaborators.length} online`
  const collaboratorLabel = collaborators.length === 1
    ? "Only you are here"
    : `${collaborators.length} collaborators online: ${collaborators
        .map((user) => user.name)
        .join(", ")}`

  return (
    <div
      className="flex min-w-0 items-center gap-2"
      role="group"
      aria-label={collaboratorLabel}
    >
      <div className="flex -space-x-2" aria-hidden="true">
        {visibleCollaborators.map((user) => (
          <EntityAvatar
            key={user.id}
            name={user.name}
            image={user.image}
            colorKey={user.id}
            size="sm"
            className="ring-2 ring-card"
          />
        ))}
        {hiddenCount > 0 ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-muted type-caption font-semibold text-muted-foreground ring-2 ring-card">
            +{hiddenCount}
          </span>
        ) : null}
      </div>
      <Text variant="caption" tone="muted" className="whitespace-nowrap">
        {presenceSummary}
      </Text>
    </div>
  )
}
