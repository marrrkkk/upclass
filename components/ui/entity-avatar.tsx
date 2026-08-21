import * as React from "react"

import { cn } from "@/lib/utils"
import { monogram, toneFromKey } from "@/lib/design-system"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const sizeClasses = {
  xs: "size-6 text-[11px] rounded-md",
  sm: "size-8 text-xs rounded-lg",
  md: "size-10 text-xs rounded-lg",
  lg: "size-12 text-sm rounded-xl",
  xl: "size-14 text-base rounded-2xl",
} as const

const toneClasses = {
  primary: "bg-primary-surface text-primary-text ring-primary-border",
  info: "bg-info-surface text-info-text ring-info-border",
  success: "bg-success-surface text-success-text ring-success-border",
  warning: "bg-warning-surface text-warning-text ring-warning-border",
  danger: "bg-destructive-surface text-destructive-text ring-destructive-border",
} as const

type EntityAvatarProps = {
  name: string | null | undefined
  image?: string | null
  size?: keyof typeof sizeClasses
  /** `square` for organizations and classes, `round` for people. */
  shape?: "square" | "round"
  /**
   * Key used to derive a stable accent when there is no image. Defaults to the
   * name, so the same entity keeps the same colour everywhere.
   */
  colorKey?: string
  className?: string
}

/**
 * Avatar that always renders something sensible: the uploaded image when it
 * exists, otherwise a monogram tinted with a deterministic theme accent.
 *
 * Organizations and classes use the squared shape, people stay round — that one
 * distinction lets you tell entity types apart at a glance in dense lists.
 */
function EntityAvatar({
  name,
  image,
  size = "md",
  shape = "round",
  colorKey,
  className,
}: EntityAvatarProps) {
  const tone = toneFromKey(colorKey ?? name ?? "upclass")
  const radius = shape === "round" ? "rounded-full" : ""

  return (
    <Avatar className={cn(sizeClasses[size], radius, "shrink-0", className)}>
      {image ? <AvatarImage src={image} alt="" className={cn(radius || "rounded-[inherit]")} /> : null}
      <AvatarFallback
        className={cn(
          "font-semibold ring-1 ring-inset",
          toneClasses[tone],
          radius || "rounded-[inherit]",
        )}
      >
        {monogram(name)}
      </AvatarFallback>
    </Avatar>
  )
}

export { EntityAvatar }
