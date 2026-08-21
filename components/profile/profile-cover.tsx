import Image from "next/image"
import * as React from "react"

import { cn } from "@/lib/utils"

type ProfileCoverTone = "neutral" | "primary" | "info" | "success" | "warning" | "danger"

const legacyCoverTones: Record<string, ProfileCoverTone> = {
  "#3b82f6": "primary",
  "#0e6b52": "primary",
  "#8b5cf6": "info",
  "#ec4899": "danger",
  "#ef4444": "danger",
  "#f97316": "warning",
  "#eab308": "warning",
  "#22c55e": "success",
  "#14b8a6": "success",
  "#06b6d4": "info",
  "#6366f1": "primary",
}

const coverSurfaceClasses: Record<ProfileCoverTone, string> = {
  neutral: "bg-surface-sunken",
  primary: "bg-primary-surface",
  info: "bg-info-surface",
  success: "bg-success-surface",
  warning: "bg-warning-surface",
  danger: "bg-destructive-surface",
}

const coverSwatchClasses: Record<ProfileCoverTone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary-strong",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
}

/** Legacy values remain valid action payloads but are never rendered as CSS. */
const PROFILE_COVER_OPTIONS = [
  { value: "#0e6b52", label: "Sky" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#6366f1", label: "Indigo" },
] as const

/** Maps arbitrary persisted input onto the finite semantic cover palette. */
function profileCoverTone(value: string | null | undefined): ProfileCoverTone {
  if (!value) return "neutral"
  return legacyCoverTones[value.trim().toLowerCase()] ?? "neutral"
}

type ProfileCoverProps = Omit<React.ComponentProps<"div">, "color"> & {
  color?: string | null
  image?: string | null
  name: string
}

/** Compact profile cover that never places persisted color values into styles. */
function ProfileCover({ color, image, name, className, ...props }: ProfileCoverProps) {
  const tone = profileCoverTone(color)

  return (
    <div
      data-slot="profile-cover"
      data-cover-tone={tone}
      className={cn(
        "relative h-20 overflow-hidden border-b border-hairline sm:h-24",
        coverSurfaceClasses[tone],
        className,
      )}
      {...props}
    >
      {image ? (
        <Image
          src={image}
          alt={`${name} cover`}
          fill
          unoptimized
          sizes="(max-width: 1152px) 100vw, 1152px"
          className="object-cover"
        />
      ) : null}
    </div>
  )
}

type ProfileCoverSwatchProps = React.ComponentProps<"span"> & {
  value: string | null | undefined
}

/** Semantic visual used by the cover picker; the legacy value is data only. */
function ProfileCoverSwatch({ value, className, ...props }: ProfileCoverSwatchProps) {
  const tone = profileCoverTone(value)

  return (
    <span
      data-slot="profile-cover-swatch"
      data-cover-tone={tone}
      className={cn("block size-4 rounded-full", coverSwatchClasses[tone], className)}
      {...props}
    />
  )
}

export {
  PROFILE_COVER_OPTIONS,
  ProfileCover,
  ProfileCoverSwatch,
  profileCoverTone,
  type ProfileCoverTone,
}
