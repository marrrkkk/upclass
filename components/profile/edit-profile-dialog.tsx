"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2, Palette, Image as ImageIcon, X, Crop, Pencil, Check } from "lucide-react"
import { updateProfile } from "@/app/actions/profile"
import { Button, buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"
import { CoverCropper } from "./cover-cropper"
import { ImageCropper } from "@/components/settings/image-cropper"

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

// Premium cover colors - same as class colors for consistency
const coverColors = [
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
]

export function EditProfileDialog({ user }: EditProfileDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Avatar state
  const [imageUrl, setImageUrl] = useState<string>(user.image || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarCropOpen, setAvatarCropOpen] = useState(false)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)

  // Cover state
  const [coverColor, setCoverColor] = useState(user.coverColor || "#3b82f6")
  const [coverImageUrl, setCoverImageUrl] = useState<string>(user.cover || "")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [coverCropOpen, setCoverCropOpen] = useState(false)
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null)

  const { startUpload, isUploading } = useUploadThing("imageUploader")

  const handleSubmit = async (formData: FormData) => {
    setError(null)

    // Upload avatar if selected
    if (selectedFile) {
      try {
        const uploadResult = await startUpload([selectedFile])
        if (uploadResult && uploadResult[0]) {
          formData.append("image", uploadResult[0].ufsUrl || uploadResult[0].url || "")
        }
      } catch (err) {
        setError("Failed to upload avatar image")
        return
      }
    } else if (imageUrl && !imageUrl.startsWith("data:") && !imageUrl.startsWith("blob:")) {
      formData.append("image", imageUrl)
    }

    // Upload cover image if selected
    if (coverFile) {
      try {
        const uploadResult = await startUpload([coverFile])
        if (uploadResult && uploadResult[0]) {
          formData.append("cover", uploadResult[0].ufsUrl || uploadResult[0].url || "")
        }
      } catch (err) {
        setError("Failed to upload cover image")
        return
      }
    } else if (coverImageUrl && !coverImageUrl.startsWith("data:") && !coverImageUrl.startsWith("blob:")) {
      formData.append("cover", coverImageUrl)
    }

    // Add cover color
    formData.append("coverColor", coverColor)

    // Role is required but shouldn't change in edit mode
    formData.append("role", user.role || "student")

    startTransition(async () => {
      const res = await updateProfile(formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      setOpen(false)
      // Reset form
      setSelectedFile(null)
      setImageUrl(user.image || "")
      setCoverFile(null)
      setCoverImageUrl(user.cover || "")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      if (coverInputRef.current) {
        coverInputRef.current.value = ""
      }
      router.refresh()
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setError(null)
      // Open cropper instead of directly setting
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarCropSrc(reader.result as string)
        setAvatarCropOpen(true)
      }
      reader.readAsDataURL(file)
    }
    // Reset input
    e.target.value = ""
  }

  const handleAvatarCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
    setSelectedFile(file)
    const previewUrl = URL.createObjectURL(croppedBlob)
    setImageUrl(previewUrl)
  }

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setError(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverCropSrc(reader.result as string)
        setCoverCropOpen(true)
      }
      reader.readAsDataURL(file)
    }
    // Reset input
    e.target.value = ""
  }

  const handleCoverCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], "cover.jpg", { type: "image/jpeg" })
    setCoverFile(file)
    const previewUrl = URL.createObjectURL(croppedBlob)
    setCoverImageUrl(previewUrl)
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-2 shadow-sm h-9 px-4 transition-all hover:bg-secondary/80 text-foreground font-medium")}
            type="button"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[550px] gap-0 p-0 border-0 shadow-2xl max-h-[90vh] flex flex-col overflow-y-auto">
          {/* Cover Preview */}
          <div
            className="h-28 relative overflow-hidden"
            style={{ backgroundColor: coverColor }}
          >
            {coverImageUrl && (
              <img
                src={coverImageUrl}
                alt="Cover preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <DialogHeader className="p-6 pt-4 pb-2">
              <DialogTitle className="text-xl font-semibold tracking-tight">Edit Profile</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Customize your profile appearance.
              </DialogDescription>
            </DialogHeader>

            <form action={handleSubmit} className="p-6 pt-2 space-y-6">
              {/* Cover Customization */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                  <Palette className="h-3 w-3" />
                  Cover
                </Label>

                <div className="flex flex-wrap gap-2">
                  {coverColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setCoverColor(color)
                        // Clear cover image when selecting a color
                        setCoverImageUrl("")
                        setCoverFile(null)
                      }}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                        coverColor === color && !coverImageUrl
                          ? "border-foreground ring-2 ring-offset-2 ring-foreground/20"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}

                  {/* Upload Cover Button */}
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all",
                      coverImageUrl && "border-primary bg-primary/10"
                    )}
                    title="Upload cover image"
                  >
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileChange}
                    className="hidden"
                  />
                </div>

                {coverImageUrl && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Custom cover image selected</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImageUrl("")
                        setCoverFile(null)
                      }}
                      className="text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Picture */}
              <div className="flex flex-col items-center gap-4 pb-2">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg transition-transform group-hover:scale-105">
                    <AvatarImage src={imageUrl || undefined} alt="Profile" className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <label
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-colors transform group-hover:scale-110"
                    title="Change photo"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="h-4 w-4" />
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1">
                    <span>{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null)
                        setImageUrl(user.image || "")
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                      }}
                      className="p-1 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Display Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={user.name}
                    placeholder="Enter your name"
                    className="h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    defaultValue={user.bio || ""}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                  />
                </div>

                {/* Role Display (read-only) */}
                {user.role && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Account Role</Label>
                    <div className="rounded-lg border border-muted-foreground/10 bg-muted/10 px-4 py-3 flex items-center justify-between">
                      <span className="font-medium capitalize">{user.role}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Read-only</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
                  {error}
                </div>
              )}

              <DialogFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setSelectedFile(null)
                    setImageUrl(user.image || "")
                    setCoverFile(null)
                    setCoverImageUrl(user.cover || "")
                    setCoverColor(user.coverColor || "#3b82f6")
                    setError(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                    if (coverInputRef.current) {
                      coverInputRef.current.value = ""
                    }
                  }}
                  className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || isUploading}
                  className={cn(buttonVariants(), "min-w-[100px] shadow-md hover:shadow-lg transition-all", (pending || isUploading) && "opacity-80")}
                >
                  {pending || isUploading ? "Saving..." : "Save Changes"}
                </button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <CoverCropper
        open={coverCropOpen}
        onOpenChange={setCoverCropOpen}
        imageSrc={coverCropSrc}
        onComplete={handleCoverCropComplete}
      />

      <ImageCropper
        open={avatarCropOpen}
        onOpenChange={setAvatarCropOpen}
        imageSrc={avatarCropSrc}
        onComplete={handleAvatarCropComplete}
      />
    </>
  )
}


