"use client"

import { useState, useRef, useTransition } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useUploadThing } from "@/lib/uploadthing"
import { updateOrganizationSettings } from "@/app/actions/organizations"
import { orgNameSchema } from "@/lib/validation/organizations"

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

interface OrgSettingsFormProps {
  orgId: string
  initialName: string
  initialDescription: string | null
  initialLogo: string | null
}

export function OrgSettingsForm({
  orgId,
  initialName,
  initialDescription,
  initialLogo,
}: OrgSettingsFormProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription || "")
  const [logoUrl, setLogoUrl] = useState(initialLogo || "")
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogo)

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useUploadThing("imageUploader")

  const validateLogo = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Logo must be a JPEG, PNG, or WebP image"
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return "Logo must be 2 MB or smaller"
    }
    return null
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateLogo(file)
    if (validationError) {
      setFieldErrors((prev) => ({ ...prev, logo: validationError }))
      e.target.value = ""
      return
    }

    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.logo
      return next
    })
    setSelectedLogoFile(file)

    // Show preview
    const previewUrl = URL.createObjectURL(file)
    setLogoPreview(previewUrl)
    e.target.value = ""
  }

  const handleRemoveLogo = () => {
    setSelectedLogoFile(null)
    setLogoPreview(null)
    setLogoUrl("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    // Validate name client-side
    const nameResult = orgNameSchema.safeParse(name)
    if (!nameResult.success) {
      setFieldErrors({
        name: nameResult.error.issues[0]?.message || "Invalid organization name",
      })
      return
    }

    if (description.length > 500) {
      setFieldErrors({ description: "Description must be at most 500 characters" })
      return
    }

    startTransition(async () => {
      let uploadedLogoUrl = logoUrl

      // Upload new logo if one was selected
      if (selectedLogoFile) {
        try {
          const uploadResult = await startUpload([selectedLogoFile])
          if (uploadResult && uploadResult[0]) {
            uploadedLogoUrl = uploadResult[0].ufsUrl || uploadResult[0].url || ""
          }
        } catch {
          setError("Failed to upload logo")
          return
        }
      }

      const result = await updateOrganizationSettings({
        orgId,
        name: nameResult.data,
        description: description || undefined,
        logo: uploadedLogoUrl || undefined,
      })

      if (result.success) {
        setSuccess("Organization settings updated")
        setSelectedLogoFile(null)
        if (uploadedLogoUrl) {
          setLogoUrl(uploadedLogoUrl)
          setLogoPreview(uploadedLogoUrl)
        }
      } else {
        setError(result.error)
      }
    })
  }

  const isLoading = isPending || isUploading

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Organization Name */}
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization Name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter organization name"
          disabled={isLoading}
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? "org-name-error" : undefined}
        />
        {fieldErrors.name && (
          <p id="org-name-error" className="text-sm text-destructive">
            {fieldErrors.name}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="org-description">Description</Label>
        <Textarea
          id="org-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your organization (optional)"
          rows={4}
          disabled={isLoading}
          aria-invalid={!!fieldErrors.description}
          aria-describedby={fieldErrors.description ? "org-desc-error" : undefined}
        />
        <div className="flex justify-between">
          {fieldErrors.description ? (
            <p id="org-desc-error" className="text-sm text-destructive">
              {fieldErrors.description}
            </p>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted-foreground">
            {description.length}/500
          </p>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
              <Image
                src={logoPreview}
                alt="Organization logo preview"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <span className="text-xs">No logo</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                {logoPreview ? "Change" : "Upload"}
              </Button>
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={isLoading}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, or WebP. Max 2 MB.
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleLogoChange}
          aria-label="Upload organization logo"
        />
        {fieldErrors.logo && (
          <p className="text-sm text-destructive">{fieldErrors.logo}</p>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3">
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  )
}
