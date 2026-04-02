"use client"

import dynamic from "next/dynamic"
import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { User, Bell, Lock, Globe, Camera, Mail, Shield, AlertTriangle, Palette, Sun, Moon, Monitor, Smartphone, Database, RefreshCw, Wifi, WifiOff, BellRing } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useStorageUpload } from "@/lib/storage/client"
import { updateSettings, deleteAccount } from "@/app/actions/settings"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/stores/settings-store"
import { BackgroundCache } from "@/lib/background-cache"
import { usePWAState } from "@/lib/pwa-state"

const ImageCropper = dynamic(
  () => import("./profile-image-cropper").then((mod) => mod.ImageCropper),
  {
    ssr: false,
  },
)

type UserData = {
  id: string
  name: string
  email: string
  image: string | null
  bio: string | null
  role: "teacher" | "student" | null
  emailNotifications: boolean
  pushNotifications: boolean
  classNotifications: boolean
  messageNotifications: boolean
  profileVisibility: string
  showEmail: boolean
  showClasses: boolean
  showResources: boolean
  createdAt: string
}

type SettingsClientProps = {
  userData: UserData
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how UpClass looks on your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Theme</Label>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:bg-muted/50",
                theme === "light"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-border"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                theme === "light" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Sun className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                theme === "light" ? "text-primary" : "text-muted-foreground"
              )}>
                Light
              </span>
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:bg-muted/50",
                theme === "dark"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-border"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                theme === "dark" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Moon className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                theme === "dark" ? "text-primary" : "text-muted-foreground"
              )}>
                Dark
              </span>
            </button>

            <button
              onClick={() => setTheme("system")}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:bg-muted/50",
                theme === "system"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-border"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                theme === "system" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Monitor className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                theme === "system" ? "text-primary" : "text-muted-foreground"
              )}>
                System
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Select your preferred theme. System will automatically switch between light and dark based on your device settings.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function SettingsClient({ userData }: SettingsClientProps) {
  const router = useRouter()
  const { setUserData, userData: storeUserData, updateUserData } = useSettingsStore()
  const [pending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState("profile")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setUserData(userData)
  }, [userData, setUserData])

  const currentUserData = storeUserData || userData

  // Profile state
  const [name, setName] = useState(currentUserData.name)
  const [bio, setBio] = useState(currentUserData.bio || "")
  const [imageUrl, setImageUrl] = useState(currentUserData.image || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useStorageUpload()

  // Cropping State
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(currentUserData.emailNotifications)
  const [pushNotifications, setPushNotifications] = useState(currentUserData.pushNotifications)
  const [classNotifications, setClassNotifications] = useState(currentUserData.classNotifications)
  const [messageNotifications, setMessageNotifications] = useState(currentUserData.messageNotifications)

  // Privacy state
  const [profileVisibility, setProfileVisibility] = useState(currentUserData.profileVisibility)
  const [showEmail, setShowEmail] = useState(currentUserData.showEmail)
  const [showClasses, setShowClasses] = useState(currentUserData.showClasses)
  const [showResources, setShowResources] = useState(currentUserData.showResources)

  // Account deletion state
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const pwaState = usePWAState((state) => state)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default")
  const [appActionPending, setAppActionPending] = useState<"cache" | "clear" | "permission" | null>(null)

  useEffect(() => {
    setName(currentUserData.name)
    setBio(currentUserData.bio || "")
    setImageUrl(currentUserData.image || "")
    setEmailNotifications(currentUserData.emailNotifications)
    setPushNotifications(currentUserData.pushNotifications)
    setClassNotifications(currentUserData.classNotifications)
    setMessageNotifications(currentUserData.messageNotifications)
    setProfileVisibility(currentUserData.profileVisibility)
    setShowEmail(currentUserData.showEmail)
    setShowClasses(currentUserData.showClasses)
    setShowResources(currentUserData.showResources)
  }, [currentUserData])

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported")
      return
    }

    setNotificationPermission(Notification.permission)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string)
        setCropModalOpen(true)
      }
      reader.readAsDataURL(file)
    }
    // Reset inputs so the same file can be selected again if needed
    e.target.value = ""
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    // Convert Blob to File
    const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
    setSelectedFile(file)

    // Create preview
    const previewUrl = URL.createObjectURL(croppedBlob)
    setImageUrl(previewUrl)
  }

  const handleSaveProfile = async () => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const formData = new FormData()
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
      } else if (imageUrl && !imageUrl.startsWith("blob:") && !imageUrl.startsWith("data:")) {
        // Only append existing URL if it's not a local preview blob
        formData.append("image", imageUrl)
      }

      const res = await updateSettings(formData, "profile")
      if (res.success) {
        updateUserData({
          name,
          bio,
          image: imageUrl && !imageUrl.startsWith("blob:") && !imageUrl.startsWith("data:") ? imageUrl : currentUserData.image,
        })
        setSuccess("Profile updated successfully")
        router.refresh()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.error)
      }
    })
  }

  const handleSaveNotifications = async () => {
    setError(null)
    setSuccess(null)

    if (pushNotifications && typeof Notification !== "undefined" && Notification.permission === "default") {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission !== "granted") {
        setError("Browser notification permission is blocked. Allow notifications first, then save again.")
        return
      }
    }

    if (pushNotifications && typeof Notification !== "undefined" && Notification.permission === "denied") {
      setNotificationPermission("denied")
      setError("Browser notifications are blocked in your browser settings.")
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("emailNotifications", emailNotifications.toString())
      formData.append("pushNotifications", pushNotifications.toString())
      formData.append("classNotifications", classNotifications.toString())
      formData.append("messageNotifications", messageNotifications.toString())

      const res = await updateSettings(formData, "notifications")
      if (res.success) {
        updateUserData({
          emailNotifications,
          pushNotifications,
          classNotifications,
          messageNotifications,
        })
        setSuccess("Notification settings updated successfully")
        router.refresh()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.error)
      }
    })
  }

  const handleSavePrivacy = async () => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("profileVisibility", profileVisibility)
      formData.append("showEmail", showEmail.toString())
      formData.append("showClasses", showClasses.toString())
      formData.append("showResources", showResources.toString())

      const res = await updateSettings(formData, "privacy")
      if (res.success) {
        updateUserData({
          profileVisibility,
          showEmail,
          showClasses,
          showResources,
        })
        setSuccess("Privacy settings updated successfully")
        router.refresh()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(res.error)
      }
    })
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      setError("Please type DELETE to confirm account deletion")
      return
    }

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("confirm", deleteConfirm)

      const res = await deleteAccount(formData)
      if (res.success) {
        // Redirect to sign-in after deletion
        window.location.href = "/sign-in"
      } else {
        setError(res.error)
      }
    })
  }

  const handleWarmOfflineCache = async () => {
    setAppActionPending("cache")
    setError(null)
    setSuccess(null)

    try {
      navigator.serviceWorker.controller?.postMessage({ type: "WARM_CORE_ROUTES" })
      setSuccess("Offline cache warm-up started for core routes.")
    } catch {
      setError("Failed to warm offline cache.")
    } finally {
      setAppActionPending(null)
    }
  }

  const handleClearLocalCache = async () => {
    setAppActionPending("clear")
    setError(null)
    setSuccess(null)

    try {
      await BackgroundCache.getInstance().clearAllCache()

      if ("caches" in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      }

      window.localStorage.removeItem("upclass-pwa-warmed-routes")
      setSuccess("Local app cache cleared on this device.")
    } catch {
      setError("Failed to clear local cache.")
    } finally {
      setAppActionPending(null)
    }
  }

  const handleEnableBrowserNotifications = async () => {
    setAppActionPending("permission")
    setError(null)
    setSuccess(null)

    try {
      if (typeof Notification === "undefined") {
        setNotificationPermission("unsupported")
        setError("This browser does not support notifications.")
        return
      }

      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === "granted") {
        setSuccess("Browser notifications enabled.")
      } else {
        setError("Notification permission was not granted.")
      }
    } finally {
      setAppActionPending(null)
    }
  }

  const memberSince = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(userData.createdAt))

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-lg">
          Manage your account preferences and customize your experience.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <div className="border-b">
          <div className="flex overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("profile")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === "profile"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === "notifications"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Bell className="h-4 w-4" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === "privacy"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Lock className="h-4 w-4" />
              Privacy
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === "appearance"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Palette className="h-4 w-4" />
              Appearance
            </button>
            <button
              onClick={() => setActiveTab("app")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === "app"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="h-4 w-4" />
              App
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === "account"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              Account
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="h-4 w-4 inline mr-2 -mt-0.5" />
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm font-medium text-green-600 animate-in fade-in slide-in-from-top-2">
              <Shield className="h-4 w-4 inline mr-2 -mt-0.5" />
              {success}
            </div>
          )}

          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Profile Section */}
            {activeTab === "profile" && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your public profile and avatar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Avatar */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
                    <div className="relative group">
                      <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                        <AvatarImage src={imageUrl || undefined} alt={name} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 shadow-md transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-4 flex-1 text-center sm:text-left">
                      <div>
                        <h3 className="font-medium text-lg">Profile Picture</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          We support PNGs, JPGs, and GIFs under 4MB.
                        </p>
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          isLoading={isUploading}
                        >
                          {isUploading ? "Uploading..." : "Upload New"}
                        </Button>
                        {imageUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setImageUrl("")
                              setSelectedFile(null)
                              if (fileInputRef.current) {
                                fileInputRef.current.value = ""
                              }
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your display name"
                        className="bg-muted/30"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us a little about yourself..."
                        rows={4}
                        className="bg-muted/30 resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground text-right">{bio.length}/500</p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <Input
                        value={userData.role || "Not set"}
                        disabled
                        className="bg-muted/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your role is managed by the administration.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSaveProfile}
                      isLoading={pending || isUploading}
                      disabled={!name.trim()}
                      className="min-w-[120px]"
                    >
                      {pending || isUploading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Section */}
            {activeTab === "notifications" && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Configure how you receive alerts and updates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive daily digests and important alerts.
                        </p>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                      <div className="space-y-0.5">
                        <Label className="text-base">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Real-time alerts for your browser.
                        </p>
                      </div>
                      <Switch
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>

                    <div className="space-y-4 pt-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Activity Alerts</h4>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Class Assignments</Label>
                          <p className="text-sm text-muted-foreground">
                            New homework, grades, and announcements.
                          </p>
                        </div>
                        <Switch
                          checked={classNotifications}
                          onCheckedChange={setClassNotifications}
                        />
                      </div>
                      <div className="h-px bg-border/50" />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Direct Messages</Label>
                          <p className="text-sm text-muted-foreground">
                            When someone sends you a message.
                          </p>
                        </div>
                        <Switch
                          checked={messageNotifications}
                          onCheckedChange={setMessageNotifications}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveNotifications} isLoading={pending}>
                      {pending ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Section */}
            {activeTab === "privacy" && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Privacy Control</CardTitle>
                  <CardDescription>
                    Manage who can see your profile and activity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="profile-visibility">Profile Visibility</Label>
                    <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                      <SelectTrigger id="profile-visibility" className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span>Public</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <span>Private</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="contacts">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Contacts Only</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This controls the visibility of your main profile page.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <h4 className="text-sm font-medium text-muted-foreground">Public Information</h4>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Email Address</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to see your email.
                        </p>
                      </div>
                      <Switch
                        checked={showEmail}
                        onCheckedChange={setShowEmail}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Enrolled Classes</Label>
                        <p className="text-sm text-muted-foreground">
                          Display classes you are part of.
                        </p>
                      </div>
                      <Switch
                        checked={showClasses}
                        onCheckedChange={setShowClasses}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Shared Resources</Label>
                        <p className="text-sm text-muted-foreground">
                          List resources you&apos;ve uploaded publicly.
                        </p>
                      </div>
                      <Switch
                        checked={showResources}
                        onCheckedChange={setShowResources}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSavePrivacy} isLoading={pending}>
                      {pending ? "Saving..." : "Update Privacy"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appearance Section */}
            {activeTab === "appearance" && (
              <AppearanceSection />
            )}

            {activeTab === "app" && (
              <div className="space-y-6">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle>Offline & Sync</CardTitle>
                    <CardDescription>
                      Manage device cache, reconnect behavior, and offline readiness.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border bg-card/50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {pwaState.online ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}
                          Connection
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{pwaState.online ? "Online" : "Offline"}</p>
                      </div>
                      <div className="rounded-xl border bg-card/50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Database className="h-4 w-4 text-primary" />
                          Cache status
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{pwaState.cacheReady ? "Ready" : "Cold"}</p>
                      </div>
                      <div className="rounded-xl border bg-card/50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <RefreshCw className="h-4 w-4 text-primary" />
                          Pending sync
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{pwaState.pendingActions}</p>
                      </div>
                      <div className="rounded-xl border bg-card/50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Shield className="h-4 w-4 text-primary" />
                          Warmed routes
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{pwaState.warmedRoutes.length}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={handleWarmOfflineCache}
                        disabled={appActionPending !== null}
                        variant="outline"
                      >
                        {appActionPending === "cache" ? "Warming Cache..." : "Warm Core Routes"}
                      </Button>
                      <Button
                        onClick={handleClearLocalCache}
                        disabled={appActionPending !== null}
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {appActionPending === "clear" ? "Clearing..." : "Clear Device Cache"}
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Last sync: {pwaState.lastSyncAt ? new Date(pwaState.lastSyncAt).toLocaleString() : "No sync recorded yet"}</p>
                      <p>App install mode: {pwaState.standalone ? "Installed" : "Browser tab"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle>Browser Notifications</CardTitle>
                    <CardDescription>
                      Check whether your browser will actually allow notification delivery.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between rounded-xl border bg-card/50 p-4">
                      <div>
                        <p className="font-medium">Permission status</p>
                        <p className="text-sm text-muted-foreground">
                          {notificationPermission === "unsupported"
                            ? "Notifications are not supported in this browser."
                            : notificationPermission === "granted"
                              ? "Browser notifications are allowed."
                              : notificationPermission === "denied"
                                ? "Browser notifications are blocked."
                                : "Permission has not been requested yet."}
                        </p>
                      </div>
                      <BellRing className="h-5 w-5 text-primary" />
                    </div>

                    <Button
                      onClick={handleEnableBrowserNotifications}
                      disabled={appActionPending !== null || notificationPermission === "granted" || notificationPermission === "unsupported"}
                    >
                      {appActionPending === "permission"
                        ? "Checking..."
                        : notificationPermission === "granted"
                          ? "Notifications Enabled"
                          : "Enable Browser Notifications"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Account Section */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                    <CardDescription>
                      Your authentication and account data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-2">
                      <Label>Email Address</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Input value={userData.email} disabled className="bg-muted/50" />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Member Since</Label>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={memberSince}
                          disabled
                          className="bg-muted/50"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive/30 shadow-sm overflow-hidden">
                  <CardHeader className="bg-destructive/5 border-b border-destructive/10">
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Irreversible actions related to your account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="font-medium">Delete Account</h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently remove your account and all of its contents. This action is not reversible, so please continue with caution.
                        </p>
                      </div>

                      <div className="flex items-end gap-4 max-w-md">
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="delete-confirm" className="text-xs uppercase font-bold text-muted-foreground">
                            Type &quot;DELETE&quot; to confirm
                          </Label>
                          <Input
                            id="delete-confirm"
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            placeholder="DELETE"
                            className="border-destructive/30 focus-visible:ring-destructive/30"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          isLoading={pending}
                          disabled={deleteConfirm !== "DELETE"}
                        >
                          {pending ? "Deleting..." : "Delete Account"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {cropModalOpen ? (
        <ImageCropper
          open={cropModalOpen}
          onOpenChange={setCropModalOpen}
          imageSrc={cropImageSrc}
          onComplete={handleCropComplete}
        />
      ) : null}
    </div>
  )
}
