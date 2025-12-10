"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, X } from "lucide-react"
import { updateProfile } from "@/app/actions/profile"
import { buttonVariants } from "@/components/ui/button"
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

type EditProfileDialogProps = {
  user: {
    id: string
    name: string
    email: string
    image: string | null
    bio: string | null
    role: "teacher" | "student" | null
  }
}

export function EditProfileDialog({ user }: EditProfileDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [imageUrl, setImageUrl] = useState<string>(user.image || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useUploadThing("imageUploader")

  const handleSubmit = async (formData: FormData) => {
    setError(null)

    // Upload image if selected
    if (selectedFile) {
      try {
        const uploadResult = await startUpload([selectedFile])
        if (uploadResult && uploadResult[0]) {
          formData.append("image", uploadResult[0].ufsUrl || uploadResult[0].url || "")
        }
      } catch (err) {
        setError("Failed to upload image")
        return
      }
    } else if (imageUrl && !imageUrl.startsWith("data:")) {
      // Keep existing image URL if it's not a data URL
      formData.append("image", imageUrl)
    }

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
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      router.refresh()
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      // Preview image
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          type="button"
        >
          Edit Profile
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={imageUrl || undefined} alt="Profile" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            {selectedFile ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    setImageUrl(user.image || "")
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
                  <Upload className="h-4 w-4" />
                  Change Photo
                </span>
              </label>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={user.name}
              placeholder="Enter your name"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={user.bio || ""}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          {/* Role Display (read-only) */}
          {user.role && (
            <div className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Role</span>
              <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm">
                <span className="capitalize">{user.role}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Role cannot be changed. Visit{" "}
                  <a href="/onboard" className="text-primary hover:underline">
                    onboarding page
                  </a>{" "}
                  to change role.
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setSelectedFile(null)
                setImageUrl(user.image || "")
                setError(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || isUploading}
              className={cn(buttonVariants())}
            >
              {pending || isUploading ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

