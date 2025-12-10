"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Save, User, Bell, Lock, Globe, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  const primaryColor = "#3b82f6"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500 bg-green-500/10 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={imageUrl || undefined} alt={name} />
                  <AvatarFallback className="text-2xl" style={{ backgroundColor: primaryColor, color: "white" }}>
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="avatar-upload">Profile Picture</Label>
                  <div className="flex items-center gap-2">
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? "Uploading..." : "Change Picture"}
                    </Button>
                    {imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
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
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 4MB
                  </p>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              {/* Role (read-only) */}
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={userData.role || "Not set"}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Role cannot be changed. Contact support if you need to change your role.
                </p>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={pending || isUploading || !name.trim()}
                style={{ backgroundColor: primaryColor }}
              >
                <Save className="h-4 w-4 mr-2" />
                {pending || isUploading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Choose how you want to be notified about activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive browser push notifications
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="class-notifications">Class Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about class announcements and classwork
                  </p>
                </div>
                <Switch
                  id="class-notifications"
                  checked={classNotifications}
                  onCheckedChange={setClassNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="message-notifications">Message Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you receive new messages
                  </p>
                </div>
                <Switch
                  id="message-notifications"
                  checked={messageNotifications}
                  onCheckedChange={setMessageNotifications}
                />
              </div>

              <Button
                onClick={handleSaveNotifications}
                disabled={pending}
                style={{ backgroundColor: primaryColor }}
              >
                <Save className="h-4 w-4 mr-2" />
                {pending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control who can see your profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profile-visibility">Profile Visibility</Label>
                <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                  <SelectTrigger id="profile-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone can view</SelectItem>
                    <SelectItem value="private">Private - Only you can view</SelectItem>
                    <SelectItem value="contacts">Contacts - Only people you've messaged</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Control who can view your profile page
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-email">Show Email Address</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your email on your public profile
                  </p>
                </div>
                <Switch
                  id="show-email"
                  checked={showEmail}
                  onCheckedChange={setShowEmail}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-classes">Show Classes</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your classes on your profile
                  </p>
                </div>
                <Switch
                  id="show-classes"
                  checked={showClasses}
                  onCheckedChange={setShowClasses}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-resources">Show Resources</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your resources on your profile
                  </p>
                </div>
                <Switch
                  id="show-resources"
                  checked={showResources}
                  onCheckedChange={setShowResources}
                />
              </div>

              <Button
                onClick={handleSavePrivacy}
                disabled={pending}
                style={{ backgroundColor: primaryColor }}
              >
                <Save className="h-4 w-4 mr-2" />
                {pending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={userData.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <Input
                    value={new Date().toLocaleDateString()}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-destructive/50 rounded-lg space-y-4">
                  <div className="space-y-0.5">
                    <Label className="text-destructive">Delete Account</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm" className="text-sm">
                      Type <span className="font-mono font-bold">DELETE</span> to confirm:
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="DELETE"
                      className="max-w-xs"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={pending || deleteConfirm !== "DELETE"}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {pending ? "Deleting..." : "Delete Account"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

