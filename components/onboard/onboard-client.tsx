"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, User as UserIcon, GraduationCap, ChevronRight, ChevronLeft, Check, Sparkles, School } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateProfile } from "@/app/actions/profile"
import { useStorageUpload } from "@/lib/storage/client"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

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
  const [step, setStep] = useState(1)
  const totalSteps = 2

  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Form State
  const [selectedRole, setSelectedRole] = useState<"teacher" | "student" | null>(
    initialData?.role || null
  )
  const [name, setName] = useState(initialData?.name || "")
  const [bio, setBio] = useState(initialData?.bio || "")
  const [imageUrl, setImageUrl] = useState<string>(initialData?.image || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useStorageUpload()

  const handleNext = () => {
    if (step === 1 && !selectedRole) {
      setError("Please select a role to continue")
      return
    }
    setError(null)
    setStep((prev) => Math.min(prev + 1, totalSteps))
  }

  const handleBack = () => {
    setError(null)
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!selectedRole) {
      setError("Please select a role")
      return
    }

    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("role", selectedRole)
      formData.append("name", name)
      formData.append("bio", bio)

      // Upload image if selected
      if (selectedFile) {
        try {
          const uploadResult = await startUpload({
            purpose: "profile-avatar",
            files: [selectedFile],
          })
          if (uploadResult && uploadResult[0]) {
            formData.append("image", uploadResult[0].url || "")
            formData.append("imageStorageBucket", uploadResult[0].bucket)
            formData.append("imageStoragePath", uploadResult[0].path)
          }
        } catch {
          setError("Failed to upload image")
          return
        }
      } else if (imageUrl && !imageUrl.startsWith("data:")) {
        // Keep existing image URL if it's not a data URL
        formData.append("image", imageUrl)
      }

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

  const progress = (step / totalSteps) * 100

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto p-4 gap-8">
      {/* Progress Indicator */}
      <div className="w-full max-w-xl space-y-2">
        <div className="flex justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Role Selection</span>
          <span>Profile Details</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="w-full max-w-2xl border-0 shadow-2xl bg-card/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">


        <div className="p-8">
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              {step === 1 ? "Choose your path" : "Tell us about yourself"}
            </h1>
            <p className="text-muted-foreground">
              {step === 1
                ? "Select how you'll be using UpClass to get a tailored experience."
                : "Complete your profile to help others recognize you."}
            </p>
          </div>

          <div className="min-h-[400px] flex flex-col">

            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-right-8 duration-500">
                <button
                  type="button"
                  onClick={() => { setSelectedRole("teacher"); setError(null); }}
                  className={cn(
                    "relative group flex flex-col items-center gap-4 rounded-xl border-2 p-8 text-center transition-all duration-300 hover:scale-[1.02]",
                    selectedRole === "teacher"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xl shadow-blue-500/10"
                      : "border-border hover:border-blue-300/50 hover:bg-muted/30",
                  )}
                >
                  {selectedRole === "teacher" && (
                    <div className="absolute top-3 right-3 text-blue-600 bg-white rounded-full p-0.5 shadow-sm">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </div>
                  )}
                  <div className={cn(
                    "rounded-2xl p-4 transition-colors duration-300",
                    selectedRole === "teacher" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-muted text-muted-foreground group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600"
                  )}>
                    <School className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl">I am a Teacher</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Create classrooms, design curriculum, assignments, and track student progress.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedRole("student"); setError(null); }}
                  className={cn(
                    "relative group flex flex-col items-center gap-4 rounded-xl border-2 p-8 text-center transition-all duration-300 hover:scale-[1.02]",
                    selectedRole === "student"
                      ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-xl shadow-purple-500/10"
                      : "border-border hover:border-purple-300/50 hover:bg-muted/30",
                  )}
                >
                  {selectedRole === "student" && (
                    <div className="absolute top-3 right-3 text-purple-600 bg-white rounded-full p-0.5 shadow-sm">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </div>
                  )}
                  <div className={cn(
                    "rounded-2xl p-4 transition-colors duration-300",
                    selectedRole === "student" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "bg-muted text-muted-foreground group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600"
                  )}>
                    <GraduationCap className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl">I am a Student</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Join classes, submit your work, collaborate with peers, and learn new skills.
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Step 2: Profile Details */}
            {step === 2 && (
              <div className="space-y-8 max-w-md mx-auto w-full animate-in fade-in slide-in-from-right-8 duration-500">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                      <AvatarImage src={imageUrl || undefined} alt="Profile" className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-4xl">
                        {(name?.[0] || "").toUpperCase() || <UserIcon className="h-12 w-12" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-background">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload a photo</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF (max 4MB)</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share a bit about yourself..."
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm font-medium text-center animate-in fade-in slide-in-from-bottom-2">
                {error}
              </div>
            )}

            {/* Navigation Actions */}
            <div className="mt-auto pt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={step === 1 || pending || isUploading}
                className={cn("", step === 1 && "invisible")}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>

              {step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!selectedRole}
                  className="min-w-[140px] h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30"
                >
                  Continue <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={pending || isUploading || !name.trim()}
                  className="min-w-[140px] h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0"
                >
                  {pending || isUploading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Get Started <Sparkles className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Help Text */}
      <p className="text-center text-xs text-muted-foreground">
        Need help? Contact support if you are unsure which role to choose.
      </p>
    </div>
  )
}

