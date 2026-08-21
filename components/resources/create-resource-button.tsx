"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileUp, Upload, X } from "lucide-react"

import { createResource } from "@/app/actions/resources"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import { Field, FieldGroup, FieldHelp, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSupabaseUpload } from "@/lib/supabase-storage"
import type { ClassCardData } from "@/types/classes"
import type { OptimisticResourceCard, ResourceListMutate } from "@/components/resources/resources-client"
import { formatClassIdentity } from "@/lib/classes/class-identity"

// Resource type options
export const RESOURCE_TYPES = [
  { value: "notes", label: "Notes" },
  { value: "slides", label: "Slides" },
  { value: "worksheet", label: "Worksheet" },
  { value: "reading", label: "Reading" },
  { value: "reference", label: "Reference" },
  { value: "template", label: "Template" },
  { value: "other", label: "Other" },
] as const

const NO_CLASS_VALUE = "none"

type CreateResourceButtonProps = {
  orgSlug?: string
  iconOnly?: boolean
  className?: string
  label?: string
  userClasses?: ClassCardData[]
  mutate: ResourceListMutate
  pending: boolean
}

function getFileType(extension: string) {
  if (extension === "pdf") return "pdf"
  if (extension === "ppt") return "ppt"
  if (extension === "pptx") return "pptx"
  if (extension === "doc") return "doc"
  if (extension === "docx") return "docx"
  if (extension === "xls") return "xls"
  if (extension === "xlsx") return "xlsx"
  if (extension === "txt") return "txt"
  return "other"
}

export function CreateResourceButton({
  orgSlug,
  iconOnly = false,
  className,
  label = "Upload",
  userClasses = [],
  mutate,
  pending,
}: CreateResourceButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [resourceType, setResourceType] = useState<string>("other")
  const [selectedClassId, setSelectedClassId] = useState<string>(NO_CLASS_VALUE)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const { startUpload, isUploading } = useSupabaseUpload("resources")

  // Find the selected class for display
  const selectedClass = userClasses.find((c) => c.id === selectedClassId)

  const clearSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const resetForm = () => {
    clearSelectedFile()
    setTitle("")
    setResourceType("other")
    setSelectedClassId(NO_CLASS_VALUE)
    setError(null)
    formRef.current?.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen && !pending && !isUploading) resetForm()
  }

  const handleCreate = async (formData: FormData) => {
    setError(null)

    if (!selectedFile) {
      setError("Please select a file first")
      return
    }

    if (!navigator.onLine) {
      setError(
        "You're offline. File uploads require an internet connection. Please check your connection and try again.",
      )
      return
    }

    startTransition(async () => {
      try {
        const uploadResult = await startUpload([selectedFile])

        if (!uploadResult || !uploadResult[0]) {
          setError("Failed to upload file. Please check your connection and try again.")
          return
        }

        const uploadedFile = uploadResult[0]
        const fileName = uploadedFile.name || selectedFile.name
        const fileExtension = fileName.split(".").pop()?.toLowerCase() || ""

        formData.set("fileUrl", uploadedFile.url || "")
        formData.set("fileName", fileName)
        formData.set("fileSize", uploadedFile.size || selectedFile.size.toString())
        formData.set("fileType", getFileType(fileExtension))
        formData.set("resourceType", resourceType)
        formData.set("storagePath", uploadedFile.path || fileName)
        if (selectedClassId !== NO_CLASS_VALUE) formData.set("classId", selectedClassId)
        else formData.delete("classId")
        if (orgSlug) formData.set("orgSlug", orgSlug)

        const tempId = `resource-${crypto.randomUUID()}`
        const optimisticCard: OptimisticResourceCard = {
          id: tempId,
          tempId,
          pending: true,
          title: title.trim() || fileName.replace(/\.[^.]+$/, ""),
          description: String(formData.get("description") || "") || null,
          category: resourceType,
          fileUrl: uploadedFile.url || "",
          fileName,
          fileType: getFileType(fileExtension),
          fileSize: uploadedFile.size || selectedFile.size.toString(),
          createdAt: new Date().toISOString(),
          authorName: null,
          authorImage: null,
        }

        void mutate(
          (previous) => [optimisticCard, ...previous],
          () => createResource(formData),
          {
            // The file is already uploaded; the resource row appears
            // immediately and settles when the server refresh lands.
            onSuccess: (_result, current) => {
              setOpen(false)
              resetForm()
              router.refresh()
              return current.filter((card) => card.tempId !== tempId)
            },
            onError: (_message, current) => {
              setOpen(false)
              resetForm()
              return current.filter((card) => card.tempId !== tempId)
            },
          },
        )
      } catch (uploadError) {
        if (!navigator.onLine) {
          setError("You're offline. Please check your internet connection and try again.")
        } else {
          setError(uploadError instanceof Error ? uploadError.message : "Failed to upload file")
        }
      }
    })
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "))
    }
    setError(null)
  }

  const handleCancel = () => {
    setOpen(false)
    resetForm()
  }

  return (
    <>
      <Button
        type="button"
        size={iconOnly ? "icon" : "default"}
        title="Upload resource"
        aria-label="Upload resource"
        onClick={() => setOpen(true)}
        className={className || "h-10 rounded-lg px-4 gap-2 font-semibold shadow-2xs"}
      >
        <Upload className="size-4" />
        {!iconOnly ? <span>{label}</span> : null}
      </Button>

      <ResponsiveOverlay
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <span className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-surface text-primary-text">
              <FileUp aria-hidden="true" className="size-5" />
            </div>
            <span className="min-w-0">
              <span className="block type-h3">Upload a resource</span>
            </span>
          </span>
        }
        description="Add one file, give it a clear name, and decide where it belongs."
        desktopClassName="sm:max-w-[42rem]"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
              className="h-10 rounded-lg px-4 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-resource-form"
              isLoading={pending || isUploading}
              disabled={!selectedFile}
              className="h-10 rounded-lg px-4 font-semibold shadow-2xs"
            >
              Upload resource
            </Button>
          </>
        }
      >
        <form
          ref={formRef}
          id="create-resource-form"
          action={handleCreate}
          className="flex flex-col gap-5"
        >
          <FieldGroup className="gap-4">
            {/* File Dropzone */}
            <Field>
              <FieldLabel
                htmlFor="resource-file-upload"
                hint={
                  selectedFile
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                    : "16 MB max"
                }
                className="text-xs font-medium"
              >
                Resource file
              </FieldLabel>
              <input
                ref={fileInputRef}
                id="resource-file-upload"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt"
                className="sr-only"
              />

              {selectedFile ? (
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary-surface/45 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Upload className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ready to upload
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${selectedFile.name}`}
                    onClick={clearSelectedFile}
                    className="touch-target size-7 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="resource-file-upload"
                  className="group flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong bg-surface-subtle/35 p-6 text-center transition-colors hover:border-primary/55 hover:bg-primary-surface/35"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                    <Upload className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">Click or drop a file here</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, PowerPoint, Excel, or Text
                    </p>
                  </div>
                </label>
              )}
              <FieldHelp className="text-[11px]">Choose one supported file to upload.</FieldHelp>
            </Field>

            <div className="grid gap-4 rounded-xl border border-hairline/70 bg-surface-subtle/25 p-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="resource-title">Resource title</FieldLabel>
                <Input
                  id="resource-title"
                  name="title"
                  required
                  placeholder="e.g. Chapter 3 Lecture Slides"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="bg-card"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="resource-type">Type</FieldLabel>
                <Select value={resourceType} onValueChange={setResourceType} name="resourceType">
                  <SelectTrigger id="resource-type" className="w-full bg-card">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Optional Class Link */}
            {userClasses.length > 0 ? (
              <Field>
                <FieldLabel htmlFor="resource-class" optional>Class context</FieldLabel>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger id="resource-class" className="w-full">
                    <SelectValue placeholder="Select a class (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLASS_VALUE}>Organization library</SelectItem>
                    {userClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {formatClassIdentity(cls)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClass ? (
                  <FieldHelp>
                    This resource will appear in <span className="font-medium">{formatClassIdentity(selectedClass)}</span>.
                  </FieldHelp>
                ) : <FieldHelp>Keep it in the shared organization library.</FieldHelp>}
              </Field>
            ) : null}

            {/* Description */}
            <Field>
              <FieldLabel htmlFor="resource-description" optional>
                Description
              </FieldLabel>
              <Textarea
                id="resource-description"
                name="description"
                placeholder="Summary of what this document covers…"
                rows={3}
                className="resize-none"
              />
            </Field>
          </FieldGroup>

          {error ? (
            <Callout tone="danger" role="alert" className="text-xs">
              {error}
            </Callout>
          ) : null}
        </form>
      </ResponsiveOverlay>
    </>
  )
}
