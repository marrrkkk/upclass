import * as React from "react"

import { cn } from "@/lib/utils"
import { EntityAvatar } from "@/components/ui/entity-avatar"

type AvatarGroupPerson = {
  id: string
  name: string | null
  image?: string | null
}

const overflowClasses = {
  xs: "size-6 type-caption",
  sm: "size-8 type-caption",
  md: "size-10 type-small",
} as const

const overlapClasses = {
  xs: "-space-x-1.5",
  sm: "-space-x-2",
  md: "-space-x-2.5",
} as const

type AvatarGroupProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** People to show, in the order they should read. Extras collapse into `+N`. */
  people: AvatarGroupPerson[]
  /** How many faces stay visible before the overflow counter. */
  max?: number
  size?: keyof typeof overflowClasses
  /**
   * Total people represented when `people` only carries a preview, so the
   * overflow counter can stay truthful about the rest of the roster.
   */
  total?: number
  /** Accessible name for the stack. Falls back to the visible names. */
  label?: string
}

/**
 * Overlapping stack of people with a truthful `+N` overflow chip.
 *
 * The faces are decorative: assistive technology reads the group label once
 * instead of walking a run of monograms, so the stack itself is `aria-hidden`
 * and the label carries the meaning.
 *
 * ```tsx
 * <AvatarGroup people={members} total={memberCount} size="xs" label="12 students" />
 * ```
 */
function AvatarGroup({
  people,
  max = 4,
  size = "sm",
  total,
  label,
  className,
  ...props
}: AvatarGroupProps) {
  const visible = people.slice(0, max)
  if (visible.length === 0) return null

  const represented = Math.max(total ?? people.length, people.length)
  const hiddenCount = Math.max(0, represented - visible.length)
  const groupLabel = label ?? visible.map((person) => person.name ?? "Member").join(", ")

  return (
    <div
      data-slot="avatar-group"
      role="group"
      aria-label={groupLabel}
      className={cn("flex shrink-0 items-center", className)}
      {...props}
    >
      <div className={cn("flex items-center", overlapClasses[size])} aria-hidden="true">
        {visible.map((person) => (
          <EntityAvatar
            key={person.id}
            name={person.name}
            image={person.image}
            colorKey={person.id}
            size={size}
            className="ring-2 ring-card"
          />
        ))}
        {hiddenCount > 0 ? (
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-card numeric-tabular",
              overflowClasses[size],
            )}
          >
            +{hiddenCount}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export { AvatarGroup, type AvatarGroupPerson }
