"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  School,
  Upload,
  UserRound,
} from "lucide-react"

import { updateProfile } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Field, FieldGroup, FieldHelp, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { Panel, PanelBody, PanelFooter } from "@/components/ui/panel"
import { Progress } from "@/components/ui/progress"
import { PageContainer, PageHeading } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { useSupabaseUpload } from "@/lib/supabase-storage"
import { cn } from "@/lib/utils"

const roleOptions = [
  {
    value: "teacher",
    title: "Teacher",
    description: "Create classes, publish coursework, and follow student progress.",
    icon: School,
  },
  {
    value: "student",
    title: "Student",
    description: "Join classes, submit work, and collaborate with classmates.",
    icon: GraduationCap,
  },
] as const

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
  const [selectedRole, setSelectedRole] = useState<"teacher" | "student" | null>(
    initialData?.role || null,
  )
  const [name, setName] = useState(initialData?.name || "")
  const [bio, setBio] = useState(initialData?.bio || "")
  const [imageUrl, setImageUrl] = useState(initialData?.image || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useSupabaseUpload("avatars")

  const handleNext = () => {
    if (step === 1 && !selectedRole) {
      setError("Please select a role to continue")
      return
    }
    setError(null)
    setStep((previous) => Math.min(previous + 1, totalSteps))
  }

  const handleBack = () => {
    setError(null)
    setStep((previous) => Math.max(previous - 1, 1))
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

      if (selectedFile) {
        try {
          const uploadResult = await startUpload([selectedFile])
          if (uploadResult && uploadResult[0]) {
            formData.append("image", uploadResult[0].url || "")
          }
        } catch {
          setError("Failed to upload image")
          return
        }
      } else if (imageUrl && !imageUrl.startsWith("data:")) {
        formData.append("image", imageUrl)
      }

      const result = await updateProfile(formData)
      if (!result.success) {
        setError(result.error)
        return
      }

      router.push("/org")
      router.refresh()
    })
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setError(null)
    const reader = new FileReader()
    reader.onloadend = () => setImageUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const saving = pending || isUploading
  const heading = step === 1 ? "Choose your role" : "Complete your profile"
  const description =
    step === 1
      ? "Select how you will use UpClass. You can update your profile details later."
      : "Add the name and optional details classmates and colleagues will recognize."

  return (
    <PageContainer
      width="narrow"
      className="flex min-h-[80vh] flex-col justify-center px-4 py-8 sm:px-6"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Text variant="overline" tone={step === 1 ? "primary" : "muted"}>
            Role
          </Text>
          <Text variant="overline" tone={step === 2 ? "primary" : "muted"}>
            Profile
          </Text>
        </div>
        <Progress value={(step / totalSteps) * 100} aria-label={`Step ${step} of ${totalSteps}`} />
      </div>

      <PageHeading
        eyebrow={`Profile setup · Step ${step} of ${totalSteps}`}
        title={heading}
        description={description}
        media={
          <IconBadge tone="primary" size="lg">
            {step === 1 ? <GraduationCap /> : <UserRound />}
          </IconBadge>
        }
      />

      <Panel padding="none" className="overflow-hidden">
        {step === 1 ? (
          <PanelBody className="p-0">
            <fieldset>
              <legend className="sr-only">Account role</legend>
              <div className="divide-y divide-hairline">
                {roleOptions.map((option) => {
                  const selected = selectedRole === option.value
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "row-interactive flex cursor-pointer items-start gap-4 px-5 py-5 text-left",
                        selected && "bg-primary-surface",
                      )}
                    >
                      <input
                        type="radio"
                        name="account-role"
                        value={option.value}
                        checked={selected}
                        required
                        onChange={() => {
                          setSelectedRole(option.value)
                          setError(null)
                        }}
                        className="mt-3 size-4 shrink-0 accent-primary"
                      />
                      <IconBadge tone={selected ? "primary" : "neutral"} size="md">
                        <option.icon />
                      </IconBadge>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Text variant="h4" as="span">
                          {option.title}
                        </Text>
                        <Text variant="small" tone="muted">
                          {option.description}
                        </Text>
                      </div>
                      {selected ? (
                        <StatusBadge tone="primary">
                          <Check aria-hidden="true" />
                          Selected
                        </StatusBadge>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </PanelBody>
        ) : (
          <PanelBody className="space-y-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <EntityAvatar
                name={name || initialData?.email || "Profile"}
                image={imageUrl || undefined}
                colorKey={initialData?.email || name || "profile"}
                size="xl"
              />
              <div className="space-y-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload aria-hidden="true" />
                  Choose a photo
                </Button>
                <Text variant="caption" tone="muted">
                  JPG, PNG or GIF, up to 4 MB.
                </Text>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                tabIndex={-1}
              />
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full name</FieldLabel>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. John Doe"
                  autoComplete="name"
                  disabled={saving}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="bio" optional>
                  Bio
                </FieldLabel>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Share a little about yourself"
                  rows={4}
                  disabled={saving}
                />
                <FieldHelp>A short introduction for people in your classes.</FieldHelp>
              </Field>
            </FieldGroup>
          </PanelBody>
        )}

        {error ? (
          <div className="px-5 pb-5">
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          </div>
        ) : null}

        <PanelFooter className="justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1 || saving}
            className={cn(step === 1 && "invisible")}
          >
            <ChevronLeft aria-hidden="true" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button type="button" onClick={handleNext} disabled={!selectedRole}>
              Continue
              <ChevronRight aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={saving || !name.trim()} isLoading={saving}>
              {saving ? "Saving profile..." : "Get started"}
              {!saving ? <ChevronRight aria-hidden="true" /> : null}
            </Button>
          )}
        </PanelFooter>
      </Panel>

      <Text variant="caption" tone="subtle" className="text-center">
        Need help choosing a role? Contact support before continuing.
      </Text>
    </PageContainer>
  )
}
