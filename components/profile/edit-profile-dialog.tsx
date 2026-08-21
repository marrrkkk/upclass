"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Image as ImageIcon, Pencil, Upload, X } from "lucide-react"

import { updateProfile } from "@/app/actions/profile"
import {
  PROFILE_COVER_OPTIONS,
  ProfileCover,
  ProfileCoverSwatch,
} from "@/components/profile/profile-cover"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Field, FieldGroup, FieldHelp, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { Text } from "@/components/ui/typography"
import { useSupabaseUpload } from "@/lib/supabase-storage"
import { cn } from "@/lib/utils"

const CoverCropper = dynamic(
  () => import("./cover-cropper").then((module) => module.CoverCropper),
  { ssr: false },
)

const ImageCropper = dynamic(
  () => import("@/components/settings/profile-image-cropper").then((module) => module.ImageCropper),
  { ssr: false },
)

type EditProfileDialogProps = {
  user: {
    id: string
    name: string
    email: string | null
    image: string | null
    cover: string | null
    coverColor: string | null
    bio: string | null
    role: "teacher" | "student" | null
  }
}

const DEFAULT_COVER_VALUE = "#0e6b52"

export function EditProfileDialog({ user }: EditProfileDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const [name, setName] = React.useState(user.name)
  const [bio, setBio] = React.useState(user.bio || "")

  const [imageUrl, setImageUrl] = React.useState(user.image || "")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [avatarCropOpen, setAvatarCropOpen] = React.useState(false)
  const [avatarCropSrc, setAvatarCropSrc] = React.useState<string | null>(null)

  const [coverColor, setCoverColor] = React.useState(user.coverColor || DEFAULT_COVER_VALUE)
  const [coverImageUrl, setCoverImageUrl] = React.useState(user.cover || "")
  const [coverFile, setCoverFile] = React.useState<File | null>(null)
  const coverInputRef = React.useRef<HTMLInputElement>(null)
  const [coverCropOpen, setCoverCropOpen] = React.useState(false)
  const [coverCropSrc, setCoverCropSrc] = React.useState<string | null>(null)

  const { startUpload, isUploading } = useSupabaseUpload("avatars")

  const reset = React.useCallback(() => {
    setError(null)
    setName(user.name)
    setBio(user.bio || "")
    setSelectedFile(null)
    setImageUrl(user.image || "")
    setCoverFile(null)
    setCoverImageUrl(user.cover || "")
    setCoverColor(user.coverColor || DEFAULT_COVER_VALUE)
    setAvatarCropSrc(null)
    setCoverCropSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (coverInputRef.current) coverInputRef.current.value = ""
  }, [user])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset()
  }

  const handleSubmit = async (formData: FormData) => {
    setError(null)

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    if (selectedFile) {
      try {
        const uploadResult = await startUpload([selectedFile])
        const uploadedImage = uploadResult?.[0]?.url
        if (!uploadedImage) {
          setError("Failed to upload avatar image")
          return
        }
        formData.append("image", uploadedImage)
      } catch {
        setError("Failed to upload avatar image")
        return
      }
    } else if (imageUrl && !imageUrl.startsWith("data:") && !imageUrl.startsWith("blob:")) {
      formData.append("image", imageUrl)
    }

    if (coverFile) {
      try {
        const uploadResult = await startUpload([coverFile])
        const uploadedCover = uploadResult?.[0]?.url
        if (!uploadedCover) {
          setError("Failed to upload cover image")
          return
        }
        formData.append("cover", uploadedCover)
      } catch {
        setError("Failed to upload cover image")
        return
      }
    } else if (
      coverImageUrl &&
      !coverImageUrl.startsWith("data:") &&
      !coverImageUrl.startsWith("blob:")
    ) {
      formData.append("cover", coverImageUrl)
    }

    formData.append("coverColor", coverColor)
    formData.append("role", user.role || "student")

    startTransition(async () => {
      const result = await updateProfile(formData)
      if (!result.success) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
      router.refresh()
    })
  }

  const readImage = (
    event: React.ChangeEvent<HTMLInputElement>,
    onRead: (value: string) => void,
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      setError(null)
      const reader = new FileReader()
      reader.onloadend = () => onRead(reader.result as string)
      reader.readAsDataURL(file)
    }
    event.target.value = ""
  }

  const handleAvatarCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
    setSelectedFile(file)
    setImageUrl(URL.createObjectURL(croppedBlob))
  }

  const handleCoverCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], "cover.jpg", { type: "image/jpeg" })
    setCoverFile(file)
    setCoverImageUrl(URL.createObjectURL(croppedBlob))
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil aria-hidden="true" />
        Edit profile
      </Button>

      <ResponsiveOverlay
        open={open}
        onOpenChange={handleOpenChange}
        title="Edit profile"
        description="Update your identity, biography, and profile images."
        desktopClassName="sm:max-w-xl"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-profile-form"
              isLoading={pending || isUploading}
              disabled={!name.trim()}
            >
              {pending || isUploading ? "Saving" : "Save changes"}
            </Button>
          </>
        }
      >
        <ProfileCover
          color={coverColor}
          image={coverImageUrl}
          name="Profile cover preview"
          className="h-20 sm:h-20"
        />

        <form id="edit-profile-form" action={handleSubmit} className="space-y-6 px-1 pt-5">
          <Field>
            <FieldLabel>Cover</FieldLabel>
            <div role="radiogroup" aria-label="Cover color" className="flex flex-wrap gap-2">
              {PROFILE_COVER_OPTIONS.map((option) => {
                const selected = coverColor === option.value && !coverImageUrl
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={option.label}
                    onClick={() => {
                      setCoverColor(option.value)
                      setCoverImageUrl("")
                      setCoverFile(null)
                    }}
                    className={cn(
                      "touch-target focus-ring flex size-9 items-center justify-center rounded-md border transition-colors",
                      selected
                        ? "border-primary bg-primary-surface"
                        : "border-hairline bg-card hover:bg-muted",
                    )}
                  >
                    <ProfileCoverSwatch value={option.value} />
                  </button>
                )
              })}
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Upload cover image"
                onClick={() => coverInputRef.current?.click()}
                className="touch-target"
              >
                <ImageIcon aria-hidden="true" />
              </Button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  readImage(event, (value) => {
                    setCoverCropSrc(value)
                    setCoverCropOpen(true)
                  })
                }
              />
            </div>
            <FieldHelp>Choose a semantic cover tone or upload a cropped image.</FieldHelp>
            {coverImageUrl ? (
              <div className="flex items-center gap-2">
                <Text variant="caption" tone="success" className="inline-flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-3.5" />
                  Cover image selected
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCoverImageUrl("")
                    setCoverFile(null)
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : null}
          </Field>

          <Field>
            <FieldLabel>Profile picture</FieldLabel>
            <div className="flex items-center gap-4">
              <EntityAvatar
                name={name || user.name}
                image={imageUrl || null}
                colorKey={user.id}
                size="xl"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload aria-hidden="true" />
                  Upload
                </Button>
                {imageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null)
                      setImageUrl("")
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  >
                    <X aria-hidden="true" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  readImage(event, (value) => {
                    setAvatarCropSrc(value)
                    setAvatarCropOpen(true)
                  })
                }
              />
            </div>
            <FieldHelp>PNG, JPG, or GIF up to 4 MB.</FieldHelp>
          </Field>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
              <Input
                id="profile-name"
                name="name"
                value={name}
                required
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-bio" optional hint={`${bio.length}/500`}>
                Biography
              </FieldLabel>
              <Textarea
                id="profile-bio"
                name="bio"
                value={bio}
                rows={4}
                maxLength={500}
                className="resize-none"
                onChange={(event) => setBio(event.target.value)}
              />
            </Field>

            {user.role ? (
              <Field>
                <FieldLabel>Account role</FieldLabel>
                <div className="flex items-center justify-between border-y border-hairline py-3">
                  <StatusBadge tone={user.role === "teacher" ? "info" : "neutral"} dot>
                    {user.role === "teacher" ? "Teacher" : "Student"}
                  </StatusBadge>
                  <Text variant="caption" tone="muted">
                    Read-only
                  </Text>
                </div>
              </Field>
            ) : null}
          </FieldGroup>

          {error ? (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          ) : null}
        </form>
      </ResponsiveOverlay>

      {coverCropOpen ? (
        <CoverCropper
          open={coverCropOpen}
          onOpenChange={setCoverCropOpen}
          imageSrc={coverCropSrc}
          onComplete={handleCoverCropComplete}
        />
      ) : null}

      {avatarCropOpen ? (
        <ImageCropper
          open={avatarCropOpen}
          onOpenChange={setAvatarCropOpen}
          imageSrc={avatarCropSrc}
          onComplete={handleAvatarCropComplete}
        />
      ) : null}
    </>
  )
}
