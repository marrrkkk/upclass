"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Save, User, Bell, Lock, Globe, Trash2, Camera, Mail, Shield, AlertTriangle } from "lucide-react"
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
import { useUploadThing } from "@/lib/uploadthing"
import { updateSettings, deleteAccount } from "@/app/actions/settings"
import { cn } from "@/lib/utils"
// Ensure Separator is available or use a div
// import { Separator } from "@/components/ui/separator" 

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
}

type SettingsClientProps = {
  userData: UserData
}

export function SettingsClient({ userData }: SettingsClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState("profile")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Profile state
  const [name, setName] = useState(userData.name)
  const [bio, setBio] = useState(userData.bio || "")
  const [imageUrl, setImageUrl] = useState(userData.image || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useUploadThing("imageUploader")

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(userData.emailNotifications)
  const [pushNotifications, setPushNotifications] = useState(userData.pushNotifications)
  const [classNotifications, setClassNotifications] = useState(userData.classNotifications)
  const [messageNotifications, setMessageNotifications] = useState(userData.messageNotifications)

  // Privacy state
  const [profileVisibility, setProfileVisibility] = useState(userData.profileVisibility)
  const [showEmail, setShowEmail] = useState(userData.showEmail)
  const [showClasses, setShowClasses] = useState(userData.showClasses)
  const [showResources, setShowResources] = useState(userData.showResources)

  // Account deletion state
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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
          const uploadResult = await startUpload([selectedFile])
          if (uploadResult && uploadResult[0]) {
            formData.append("image", uploadResult[0].ufsUrl || uploadResult[0].url || "")
          }
        } catch (err) {
          setError("Failed to upload image")
          return
        }
      } else if (imageUrl && !imageUrl.startsWith("data:")) {
        formData.append("image", imageUrl)
      }

      const res = await updateSettings(formData, "profile")
      if (res.success) {
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

    startTransition(async () => {
      const formData = new FormData()
      formData.append("emailNotifications", emailNotifications.toString())
      formData.append("pushNotifications", pushNotifications.toString())
      formData.append("classNotifications", classNotifications.toString())
      formData.append("messageNotifications", messageNotifications.toString())

      const res = await updateSettings(formData, "notifications")
      if (res.success) {
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const NavItem = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        activeTab === id
          ? "bg-primary text-primary-foreground shadow-md"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )

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
                          disabled={isUploading}
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
                      disabled={pending || isUploading || !name.trim()}
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
                    <Button onClick={handleSaveNotifications} disabled={pending}>
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
                    <Button onClick={handleSavePrivacy} disabled={pending}>
                      {pending ? "Saving..." : "Update Privacy"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                          value={new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
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
                          disabled={pending || deleteConfirm !== "DELETE"}
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
    </div>
  )
}

