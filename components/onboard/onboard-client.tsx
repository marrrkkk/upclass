"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, User as UserIcon, GraduationCap, BookOpen, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateProfile } from "@/app/actions/profile"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"

type OnboardClientProps = {
  initialData?: {
    name?: string | null
    email?: string | null
    image?: string | null
    bio?: string | null
    role?: "teacher" | "student" | null
  }
}

export function OnboardClient({ initialData }: OnboardClientProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selectedRole, setSelectedRole] = useState<"teacher" | "student" | null>(
    initialData?.role || null
  )
  const [imageUrl, setImageUrl] = useState<string>(initialData?.image || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useUploadThing("imageUploader")

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    
    if (!selectedRole) {
      setError("Please select a role")
      return
    }

    formData.append("role", selectedRole)
    
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

    startTransition(async () => {
      const res = await updateProfile(formData)
      if (!res.success) {
        setError(res.error)
        return
      }
      router.push("/home")
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

  return (
    <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            {initialData?.role ? "Edit Profile" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription>
            {initialData?.role
              ? "Update your profile information"
              : "Tell us about yourself to get started with UpClass"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={imageUrl || undefined} alt="Profile" />
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  <UserIcon className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              {selectedFile ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setImageUrl(initialData?.image || "")
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
                  <span className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </span>
                </label>
              )}
            </div>

            {/* Name */}
            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Name *</span>
              <input
                name="name"
                required
                defaultValue={initialData?.name || ""}
                placeholder="Enter your name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              />
            </label>

            {/* Bio */}
            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Bio</span>
              <textarea
                name="bio"
                defaultValue={initialData?.bio || ""}
                placeholder="Tell us about yourself..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                rows={4}
              />
            </label>

            {/* Role Selection */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Role *</span>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole("teacher")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-left transition-all hover:border-blue-500",
                    selectedRole === "teacher"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                      : "border-input",
                  )}
                >
                  <div className={cn(
                    "rounded-full p-3",
                    selectedRole === "teacher" ? "bg-blue-600" : "bg-muted"
                  )}>
                    <GraduationCap className={cn(
                      "h-6 w-6",
                      selectedRole === "teacher" ? "text-white" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold">Teacher</p>
                    <p className="text-sm text-muted-foreground">
                      Create and manage classes, assign work, and grade submissions
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("student")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-left transition-all hover:border-blue-500",
                    selectedRole === "student"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                      : "border-input",
                  )}
                >
                  <div className={cn(
                    "rounded-full p-3",
                    selectedRole === "student" ? "bg-blue-600" : "bg-muted"
                  )}>
                    <BookOpen className={cn(
                      "h-6 w-6",
                      selectedRole === "student" ? "text-white" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold">Student</p>
                    <p className="text-sm text-muted-foreground">
                      Join classes, submit assignments, and track your progress
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={pending || isUploading || !selectedRole}
                className={cn(
                  buttonVariants(),
                  "bg-blue-600 hover:bg-blue-700 disabled:opacity-70",
                )}
              >
                {pending || isUploading ? "Saving..." : initialData?.role ? "Update Profile" : "Complete Profile"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
  )
}

