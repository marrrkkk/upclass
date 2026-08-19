"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Bell,
  BellRing,
  BookOpen,
  Camera,
  Database,
  Globe,
  Lock,
  Mail,
  MessageSquare,
  RefreshCw,
  Shield,
  Smartphone,
  User,
  Wifi,
  WifiOff,
} from "lucide-react"

import { deleteAccount, updateSettings } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { EntityRow } from "@/components/ui/entity-row"
import { Field, FieldGroup, FieldHelp, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import {
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelHeading,
  PanelTitle,
  PanelDescription,
} from "@/components/ui/panel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatGroup, StatTile } from "@/components/ui/stat-tile"
import { StatusBadge } from "@/components/ui/status-badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Text } from "@/components/ui/typography"
import { BackgroundCache } from "@/lib/background-cache"
import { usePWAState } from "@/lib/pwa-state"
import { useSupabaseUpload } from "@/lib/supabase-storage"

const ImageCropper = dynamic(
  () => import("./profile-image-cropper").then((module) => module.ImageCropper),
  { ssr: false },
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

type SettingsTab = "profile" | "notifications" | "privacy" | "app" | "account"

export function SettingsClient({ userData }: SettingsClientProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("profile")
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const currentUserData = userData
  const [name, setName] = React.useState(currentUserData.name)
  const [bio, setBio] = React.useState(currentUserData.bio || "")
  const [imageUrl, setImageUrl] = React.useState(currentUserData.image || "")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useSupabaseUpload("avatars")

  const [cropModalOpen, setCropModalOpen] = React.useState(false)
  const [cropImageSrc, setCropImageSrc] = React.useState<string | null>(null)

  const [emailNotifications, setEmailNotifications] = React.useState(
    currentUserData.emailNotifications,
  )
  const [pushNotifications, setPushNotifications] = React.useState(
    currentUserData.pushNotifications,
  )
  const [classNotifications, setClassNotifications] = React.useState(
    currentUserData.classNotifications,
  )
  const [messageNotifications, setMessageNotifications] = React.useState(
    currentUserData.messageNotifications,
  )

  const [profileVisibility, setProfileVisibility] = React.useState(
    currentUserData.profileVisibility,
  )
  const [showEmail, setShowEmail] = React.useState(currentUserData.showEmail)
  const [showClasses, setShowClasses] = React.useState(currentUserData.showClasses)
  const [showResources, setShowResources] = React.useState(currentUserData.showResources)

  const [deleteConfirm, setDeleteConfirm] = React.useState("")
  const pwaState = usePWAState((state) => state)
  const [notificationPermission, setNotificationPermission] = React.useState<
    NotificationPermission | "unsupported"
  >(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission))
  const [appActionPending, setAppActionPending] = React.useState<
    "cache" | "clear" | "permission" | null
  >(null)

  const [syncedUserData, setSyncedUserData] = React.useState(currentUserData)
  if (currentUserData !== syncedUserData) {
    setSyncedUserData(currentUserData)
    setName(currentUserData.name)
    setBio(currentUserData.bio || "")
    setImageUrl(currentUserData.image || "")
    setSelectedFile(null)
    setEmailNotifications(currentUserData.emailNotifications)
    setPushNotifications(currentUserData.pushNotifications)
    setClassNotifications(currentUserData.classNotifications)
    setMessageNotifications(currentUserData.messageNotifications)
    setProfileVisibility(currentUserData.profileVisibility)
    setShowEmail(currentUserData.showEmail)
    setShowClasses(currentUserData.showClasses)
    setShowResources(currentUserData.showResources)
  }

  const showSaved = (message: string) => {
    setSuccess(message)
    window.setTimeout(() => setSuccess(null), 3000)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string)
        setCropModalOpen(true)
      }
      reader.readAsDataURL(file)
    }
    event.target.value = ""
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
    setSelectedFile(file)
    setImageUrl(URL.createObjectURL(croppedBlob))
  }

  const handleSaveProfile = () => {
    setError(null)
    setSuccess(null)

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("bio", bio)
      let persistedImage: string | null = imageUrl || null

      if (selectedFile) {
        try {
          const uploadResult = await startUpload([selectedFile])
          persistedImage = uploadResult?.[0]?.url ?? null
          if (!persistedImage) {
            setError("Failed to upload image")
            return
          }
          formData.append("image", persistedImage)
        } catch {
          setError("Failed to upload image")
          return
        }
      } else if (imageUrl && !imageUrl.startsWith("blob:") && !imageUrl.startsWith("data:")) {
        formData.append("image", imageUrl)
      } else if (!imageUrl) {
        persistedImage = null
      }

      const result = await updateSettings(formData, "profile")
      if (!result.success) {
        setError(result.error)
        return
      }

      setSelectedFile(null)
      if (persistedImage) setImageUrl(persistedImage)
      showSaved("Profile settings saved")
      router.refresh()
    })
  }

  const handleSaveNotifications = async () => {
    setError(null)
    setSuccess(null)

    if (
      pushNotifications &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission !== "granted") {
        setError("Browser notification permission is blocked. Allow notifications, then save again.")
        return
      }
    }

    if (
      pushNotifications &&
      typeof Notification !== "undefined" &&
      Notification.permission === "denied"
    ) {
      setNotificationPermission("denied")
      setError("Browser notifications are blocked in your browser settings.")
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("emailNotifications", String(emailNotifications))
      formData.append("pushNotifications", String(pushNotifications))
      formData.append("classNotifications", String(classNotifications))
      formData.append("messageNotifications", String(messageNotifications))

      const result = await updateSettings(formData, "notifications")
      if (!result.success) {
        setError(result.error)
        return
      }

      showSaved("Notification settings saved")
      router.refresh()
    })
  }

  const handleSavePrivacy = () => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("profileVisibility", profileVisibility)
      formData.append("showEmail", String(showEmail))
      formData.append("showClasses", String(showClasses))
      formData.append("showResources", String(showResources))

      const result = await updateSettings(formData, "privacy")
      if (!result.success) {
        setError(result.error)
        return
      }

      showSaved("Privacy settings saved")
      router.refresh()
    })
  }

  const handleDeleteAccount = () => {
    if (deleteConfirm !== "DELETE") {
      setError("Please type DELETE to confirm account deletion")
      return
    }

    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append("confirm", deleteConfirm)
      const result = await deleteAccount(formData)
      if (result.success) {
        window.location.href = "/sign-in"
      } else {
        setError(result.error)
      }
    })
  }

  const handleWarmOfflineCache = async () => {
    setAppActionPending("cache")
    setError(null)
    setSuccess(null)
    try {
      navigator.serviceWorker.controller?.postMessage({ type: "WARM_CORE_ROUTES" })
      showSaved("Offline cache warm-up started")
    } catch {
      setError("Failed to warm offline cache")
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
      showSaved("Device cache cleared")
    } catch {
      setError("Failed to clear local cache")
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
        setError("This browser does not support notifications")
        return
      }

      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === "granted") {
        showSaved("Browser notifications enabled")
      } else {
        setError("Notification permission was not granted")
      }
    } finally {
      setAppActionPending(null)
    }
  }

  const memberSince = formatMemberSince(userData.createdAt)
  const notificationStatus = permissionStatus(notificationPermission)

  return (
    <>
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      {success ? <Callout tone="success">{success}</Callout> : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsTab)}
        variant="solid"
        className="space-y-5"
      >
        <TabsList aria-label="Settings sections" className="scroll-x-region">
          <TabsTrigger value="profile">
            <User aria-hidden="true" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell aria-hidden="true" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Lock aria-hidden="true" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="app">
            <Smartphone aria-hidden="true" />
            App
          </TabsTrigger>
          <TabsTrigger value="account">
            <Shield aria-hidden="true" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Panel padding="none">
            <PanelHeader>
              <PanelHeading>
                <PanelTitle>Profile information</PanelTitle>
                <PanelDescription>Update the identity shown across UpClass.</PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <PanelBody className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <EntityAvatar
                  name={name || currentUserData.name}
                  image={imageUrl || null}
                  colorKey={currentUserData.id}
                  size="xl"
                />
                <div className="min-w-0 flex-1">
                  <Text variant="h4">Profile picture</Text>
                  <Text variant="caption" tone="muted">
                    PNG, JPG, or GIF up to 4 MB.
                  </Text>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera aria-hidden="true" />
                    Upload
                  </Button>
                  {imageUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImageUrl("")
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="settings-name">Display name</FieldLabel>
                  <Input
                    id="settings-name"
                    value={name}
                    required
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-bio" optional hint={`${bio.length}/500`}>
                    Biography
                  </FieldLabel>
                  <Textarea
                    id="settings-bio"
                    value={bio}
                    rows={4}
                    maxLength={500}
                    className="resize-none"
                    onChange={(event) => setBio(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-role">Account role</FieldLabel>
                  <Input id="settings-role" value={userData.role || "Not set"} disabled />
                  <FieldHelp>Role changes are managed by an administrator.</FieldHelp>
                </Field>
              </FieldGroup>
            </PanelBody>
            <PanelFooter className="sm:justify-end">
              <Button
                type="button"
                onClick={handleSaveProfile}
                isLoading={pending || isUploading}
                disabled={!name.trim()}
              >
                {pending || isUploading ? "Saving" : "Save profile"}
              </Button>
            </PanelFooter>
          </Panel>
        </TabsContent>

        <TabsContent value="notifications">
          <Panel padding="none" className="overflow-hidden">
            <PanelHeader>
              <PanelHeading>
                <PanelTitle>Notifications</PanelTitle>
                <PanelDescription>Choose which account events reach you.</PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <div className="divide-y divide-hairline">
              <SettingToggleRow
                icon={Mail}
                title="Email notifications"
                description="Daily digests and important account alerts."
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
              <SettingToggleRow
                icon={BellRing}
                title="Push notifications"
                description="Real-time browser alerts."
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
              <SettingToggleRow
                icon={BookOpen}
                title="Class activity"
                description="Assignments, grades, and announcements."
                checked={classNotifications}
                onCheckedChange={setClassNotifications}
              />
              <SettingToggleRow
                icon={MessageSquare}
                title="Direct messages"
                description="Alerts when someone sends you a message."
                checked={messageNotifications}
                onCheckedChange={setMessageNotifications}
              />
            </div>
            <PanelFooter className="sm:justify-end">
              <Button type="button" onClick={handleSaveNotifications} isLoading={pending}>
                {pending ? "Saving" : "Save notifications"}
              </Button>
            </PanelFooter>
          </Panel>
        </TabsContent>

        <TabsContent value="privacy">
          <Panel padding="none" className="overflow-hidden">
            <PanelHeader>
              <PanelHeading>
                <PanelTitle>Privacy</PanelTitle>
                <PanelDescription>Control who can open your profile and what they see.</PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <PanelBody>
              <Field>
                <FieldLabel htmlFor="profile-visibility">Profile visibility</FieldLabel>
                <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                  <SelectTrigger id="profile-visibility" className="w-full sm:max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <span className="flex items-center gap-2">
                        <Globe aria-hidden="true" className="size-4 text-muted-foreground" />
                        Public
                      </span>
                    </SelectItem>
                    <SelectItem value="contacts">
                      <span className="flex items-center gap-2">
                        <User aria-hidden="true" className="size-4 text-muted-foreground" />
                        Contacts only
                      </span>
                    </SelectItem>
                    <SelectItem value="private">
                      <span className="flex items-center gap-2">
                        <Lock aria-hidden="true" className="size-4 text-muted-foreground" />
                        Private
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FieldHelp>
                  Contacts are people with whom you have already exchanged messages.
                </FieldHelp>
              </Field>
            </PanelBody>
            <div className="divide-y divide-hairline border-t border-hairline">
              <SettingToggleRow
                icon={Mail}
                title="Show email address"
                description="Display your email on your visible profile."
                checked={showEmail}
                onCheckedChange={setShowEmail}
              />
              <SettingToggleRow
                icon={BookOpen}
                title="Show classes"
                description="Display classes you teach or attend."
                checked={showClasses}
                onCheckedChange={setShowClasses}
              />
              <SettingToggleRow
                icon={Database}
                title="Show resources"
                description="Display resources you have shared."
                checked={showResources}
                onCheckedChange={setShowResources}
              />
            </div>
            <PanelFooter className="sm:justify-end">
              <Button type="button" onClick={handleSavePrivacy} isLoading={pending}>
                {pending ? "Saving" : "Save privacy"}
              </Button>
            </PanelFooter>
          </Panel>
        </TabsContent>

        <TabsContent value="app" className="space-y-5">
          <StatGroup columns={4}>
            <StatTile
              label="Connection"
              value={pwaState.online ? "Online" : "Offline"}
              tone={pwaState.online ? "success" : "warning"}
            />
            <StatTile
              label="Cache"
              value={pwaState.cacheReady ? "Ready" : "Cold"}
              tone={pwaState.cacheReady ? "success" : "neutral"}
            />
            <StatTile label="Pending sync" value={pwaState.pendingActions} tone="info" />
            <StatTile label="Warmed routes" value={pwaState.warmedRoutes.length} tone="primary" />
          </StatGroup>

          <Panel padding="none">
            <PanelHeader>
              <PanelHeading>
                <PanelTitle>Offline and sync</PanelTitle>
                <PanelDescription>Manage cached routes and local app data on this device.</PanelDescription>
              </PanelHeading>
              <StatusBadge tone={pwaState.online ? "success" : "warning"} dot>
                {pwaState.online ? "Connected" : "Offline"}
              </StatusBadge>
            </PanelHeader>
            <PanelBody className="space-y-2">
              <Text variant="small" tone="muted">
                Last sync: {pwaState.lastSyncAt ? new Date(pwaState.lastSyncAt).toLocaleString() : "None"}
              </Text>
              <Text variant="small" tone="muted">
                Install mode: {pwaState.standalone ? "Installed app" : "Browser tab"}
              </Text>
            </PanelBody>
            <PanelFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleWarmOfflineCache}
                disabled={appActionPending !== null}
              >
                <RefreshCw aria-hidden="true" />
                {appActionPending === "cache" ? "Warming" : "Warm core routes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearLocalCache}
                disabled={appActionPending !== null}
                className="border-destructive-border text-destructive-text hover:bg-destructive-surface hover:text-destructive-text"
              >
                <Database aria-hidden="true" />
                {appActionPending === "clear" ? "Clearing" : "Clear device cache"}
              </Button>
            </PanelFooter>
          </Panel>

          <Panel padding="none">
            <PanelHeader>
              <PanelHeading>
                <PanelTitle>Browser notifications</PanelTitle>
                <PanelDescription>Check notification permission for this browser.</PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <EntityRow
              media={
                <IconBadge tone={notificationStatus.tone} size="md">
                  {notificationPermission === "granted" ? <Wifi /> : <WifiOff />}
                </IconBadge>
              }
              title="Permission status"
              description={notificationStatus.description}
              status={
                <StatusBadge tone={notificationStatus.tone} dot>
                  {notificationStatus.label}
                </StatusBadge>
              }
              actions={
                <Button
                  type="button"
                  size="sm"
                  onClick={handleEnableBrowserNotifications}
                  disabled={
                    appActionPending !== null ||
                    notificationPermission === "granted" ||
                    notificationPermission === "unsupported"
                  }
                >
                  {appActionPending === "permission" ? "Checking" : "Enable"}
                </Button>
              }
            />
          </Panel>
        </TabsContent>

        <TabsContent value="account" className="space-y-5">
          <Panel padding="none">
            <PanelHeader>
              <PanelHeading>
                <PanelTitle>Account details</PanelTitle>
                <PanelDescription>Authentication details for this account.</PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <PanelBody>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="account-email">Email address</FieldLabel>
                  <Input id="account-email" value={userData.email} disabled />
                </Field>
                <Field>
                  <FieldLabel htmlFor="member-since">Member since</FieldLabel>
                  <Input id="member-since" value={memberSince} disabled />
                </Field>
              </FieldGroup>
            </PanelBody>
          </Panel>

          <Panel padding="none" className="border-destructive-border">
            <PanelHeader className="border-destructive-border bg-destructive-surface">
              <PanelHeading>
                <PanelTitle className="text-destructive-text">
                  <AlertTriangle aria-hidden="true" />
                  Delete account
                </PanelTitle>
                <PanelDescription>Permanently removes this account and its content.</PanelDescription>
              </PanelHeading>
            </PanelHeader>
            <PanelBody className="space-y-5">
              <Callout tone="warning">
                This action cannot be undone. Type DELETE before continuing.
              </Callout>
              <Field>
                <FieldLabel htmlFor="delete-confirm">Confirmation</FieldLabel>
                <Input
                  id="delete-confirm"
                  value={deleteConfirm}
                  placeholder="DELETE"
                  onChange={(event) => setDeleteConfirm(event.target.value)}
                />
              </Field>
            </PanelBody>
            <PanelFooter className="sm:justify-end">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAccount}
                isLoading={pending}
                disabled={deleteConfirm !== "DELETE"}
              >
                {pending ? "Deleting" : "Delete account"}
              </Button>
            </PanelFooter>
          </Panel>
        </TabsContent>
      </Tabs>

      {cropModalOpen ? (
        <ImageCropper
          open={cropModalOpen}
          onOpenChange={setCropModalOpen}
          imageSrc={cropImageSrc}
          onComplete={handleCropComplete}
        />
      ) : null}
    </>
  )
}

function SettingToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ElementType
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <EntityRow
      media={
        <IconBadge tone="neutral" size="sm">
          <Icon />
        </IconBadge>
      }
      title={title}
      description={description}
      actions={
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-label={title}
        />
      }
    />
  )
}

function formatMemberSince(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

function permissionStatus(permission: NotificationPermission | "unsupported") {
  if (permission === "granted") {
    return {
      label: "Allowed",
      description: "This browser can receive notifications.",
      tone: "success" as const,
    }
  }
  if (permission === "denied") {
    return {
      label: "Blocked",
      description: "Change permission in your browser settings.",
      tone: "danger" as const,
    }
  }
  if (permission === "unsupported") {
    return {
      label: "Unsupported",
      description: "This browser does not support notifications.",
      tone: "neutral" as const,
    }
  }
  return {
    label: "Not requested",
    description: "Permission has not been requested on this browser.",
    tone: "warning" as const,
  }
}
