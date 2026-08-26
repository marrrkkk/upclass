"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { ImagePlus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { monogram } from "@/lib/design-system"

const ImageCropper = dynamic(
  () => import("@/components/settings/profile-image-cropper").then((module) => module.ImageCropper),
  { ssr: false },
)

const LOGO_MAX_BYTES = 4 * 1024 * 1024
const COVER_MAX_BYTES = 16 * 1024 * 1024

/** Pending org identity: persisted URLs plus files awaiting upload on save. */
export type OrgIdentityValue = {
  /** Remote URL (already stored) or local object URL for preview. */
  logoPreview: string | null
  coverPreview: string | null
  logoFile: File | null
  coverFile: File | null
}

export const EMPTY_ORG_IDENTITY: OrgIdentityValue = {
  logoPreview: null,
  coverPreview: null,
  logoFile: null,
  coverFile: null,
}

type OrgIdentityFieldsProps = {
  value: OrgIdentityValue
  onChange: (value: OrgIdentityValue) => void
  /** Organization name, used for the monogram fallback. */
  name?: string
  disabled?: boolean
  onError?: (message: string) => void
}

/**
 * Logo + cover picker shared by organization creation and admin settings.
 *
 * Files are held locally and uploaded by the caller through
 * `persistOrgIdentity` when the surrounding form is saved, so abandoning the
 * form never leaves orphaned storage objects.
 */
export function OrgIdentityFields({
  value,
  onChange,
  name,
  disabled = false,
  onError,
}: OrgIdentityFieldsProps) {
  const [cropTarget, setCropTarget] = React.useState<"logo" | "cover" | null>(null)
  const [cropImageSrc, setCropImageSrc] = React.useState<string | null>(null)
  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const coverInputRef = React.useRef<HTMLInputElement>(null)

  const openCropper = (target: "logo" | "cover", file: File) => {
    const maxBytes = target === "logo" ? LOGO_MAX_BYTES : COVER_MAX_BYTES
    if (!file.type.startsWith("image/")) {
      onError?.("Choose a PNG, JPG, or GIF image.")
      return
    }
    if (file.size > maxBytes) {
      onError?.(
        target === "logo"
          ? "Logo images can be up to 4 MB."
          : "Cover images can be up to 16 MB.",
      )
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCropImageSrc(reader.result as string)
      setCropTarget(target)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (target: "logo" | "cover") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) openCropper(target, file)
      event.target.value = ""
    }

  const handleCropComplete = (target: "logo" | "cover", croppedBlob: Blob) => {
    const file = new File([croppedBlob], target === "logo" ? "org-logo.jpg" : "org-cover.jpg", {
      type: "image/jpeg",
    })
    onChange(
      target === "logo"
        ? { ...value, logoFile: file, logoPreview: URL.createObjectURL(croppedBlob) }
        : { ...value, coverFile: file, coverPreview: URL.createObjectURL(croppedBlob) },
    )
  }

  const removeLogo = () => {
    onChange({ ...value, logoFile: null, logoPreview: null })
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const removeCover = () => {
    onChange({ ...value, coverFile: null, coverPreview: null })
    if (coverInputRef.current) coverInputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-3" data-slot="org-identity-fields">
      <div
        className={cn(
          "relative h-28 overflow-hidden rounded-[var(--radius-container)] border border-hairline sm:h-36",
          value.coverPreview ? "bg-surface-sunken" : "bg-gradient-to-br from-primary via-primary-strong to-primary-active",
        )}
      >
        {value.coverPreview ? (
          <div
            role="img"
            aria-label="Organization cover preview"
            className="size-full"
            style={{
              backgroundImage: `url("${value.coverPreview}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(130%_130%_at_100%_0%,rgba(255,255,255,0.3),transparent_55%)]"
          />
        )}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => coverInputRef.current?.click()}
          >
            <ImagePlus data-icon="inline-start" />
            {value.coverPreview ? "Change cover" : "Upload cover"}
          </Button>
          {value.coverPreview ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={removeCover}
            >
              <Trash2 data-icon="inline-start" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-card",
          )}
        >
          {value.logoPreview ? (
            <div
              role="img"
              aria-label="Organization logo preview"
              className="size-full"
              style={{
                backgroundImage: `url("${value.logoPreview}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <span className="font-display text-lg font-semibold text-primary">
              {monogram(name || "Organization")}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="type-small font-semibold text-foreground">Organization icon</p>
          <p className="type-caption text-muted-foreground">
            Square image, PNG or JPG up to 4 MB. Shown in workspace lists.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => logoInputRef.current?.click()}
          >
            <ImagePlus data-icon="inline-start" />
            {value.logoPreview ? "Change" : "Upload"}
          </Button>
          {value.logoPreview ? (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={removeLogo}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload organization logo"
        onChange={handleFileChange("logo")}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload organization cover"
        onChange={handleFileChange("cover")}
      />

      {cropTarget ? (
        <ImageCropper
          open={cropTarget !== null}
          onOpenChange={(open) => {
            if (!open) setCropTarget(null)
          }}
          imageSrc={cropImageSrc}
          aspect={cropTarget === "logo" ? 1 : 3}
          cropShape="rect"
          title={cropTarget === "logo" ? "Crop organization icon" : "Crop cover image"}
          onComplete={(blob) => {
            const target = cropTarget
            setCropTarget(null)
            if (target) handleCropComplete(target, blob)
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * Upload pending files through `/api/upload` (logo → `avatars`, cover →
 * `media`) and resolve to the URLs that should be stored on the organization.
 */
export async function persistOrgIdentity(
  value: OrgIdentityValue,
): Promise<{ logo: string | null; cover: string | null }> {
  const upload = async (file: File, bucket: "avatars" | "media") => {
    const formData = new FormData()
    formData.append("bucket", bucket)
    formData.append("file", file)
    const response = await fetch("/api/upload", { method: "POST", body: formData })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.files?.[0]?.url) {
      throw new Error(payload?.error || "Failed to upload image")
    }
    return payload.files[0].url as string
  }

  const logo = value.logoFile ? await upload(value.logoFile, "avatars") : value.logoPreview
  const cover = value.coverFile ? await upload(value.coverFile, "media") : value.coverPreview
  return { logo, cover }
}
