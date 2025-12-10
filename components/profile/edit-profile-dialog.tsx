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
    email: string | null
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
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 shadow-sm transition-all hover:bg-muted text-foreground")}
          type="button"
        >
          Edit Profile
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden border-0 shadow-2xl">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10">
          <DialogTitle className="text-xl font-semibold tracking-tight">Edit Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Make changes to your personal profile.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-6 pb-2">
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
                rows={4}
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
                setError(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
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
      </DialogContent>
    </Dialog>
  )
}

