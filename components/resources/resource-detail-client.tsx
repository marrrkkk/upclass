"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Download,
  Edit,
  FileIcon,
  FileSpreadsheet,
  FileText,
  FileType,
  HardDrive,
  MoreHorizontal,
  Presentation,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import { deleteResource, updateResource } from "@/app/actions/resources"
import { RESOURCE_TYPES } from "@/components/resources/create-resource-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { PageContainer } from "@/components/ui/section"
import { useAiPanel } from "@/components/ai/ai-panel-provider"

import type { Tone } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { usePageHeaderStore } from "@/stores/page-header-store"

type ResourceData = {
  id: string
  title: string
  description: string | null
  resourceType: string
  classId: string | null
  category: string | null
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    image: string | null
    email: string
  }
  class?: {
    id: string
    title: string
  } | null
}

type ResourceDetailClientProps = {
  resource: ResourceData
  isOwner: boolean
  orgSlug: string
}

type FileTypeInfo = {
  icon: LucideIcon
  label: string
  tone: Tone
}

function getFileTypeInfo(type: string): FileTypeInfo {
  const normalizedType = type.toLowerCase()

  if (normalizedType === "pdf") return { icon: FileText, label: "PDF", tone: "danger" }
  if (normalizedType === "doc" || normalizedType === "docx") {
    return { icon: FileText, label: "Word document", tone: "info" }
  }
  if (
    normalizedType === "xls" ||
    normalizedType === "xlsx" ||
    normalizedType === "csv"
  ) {
    return { icon: FileSpreadsheet, label: "Spreadsheet", tone: "success" }
  }
  if (normalizedType === "ppt" || normalizedType === "pptx") {
    return { icon: Presentation, label: "Presentation", tone: "warning" }
  }
  if (normalizedType === "txt") return { icon: FileType, label: "Text file", tone: "neutral" }

  return { icon: FileIcon, label: "File", tone: "neutral" }
}

function formatFileSize(size: string | null) {
  if (!size) return "Unknown size"

  const bytes = Number.parseInt(size, 10)
  if (!Number.isFinite(bytes)) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDateShort(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function canPreview(fileType: string) {
  return fileType === "pdf" || fileType === "txt"
}

/** A single pill in the metadata strip. */
function MetaPill({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground bg-surface-subtle/80",
        className,
      )}
    >
      {Icon ? <Icon className="size-3 shrink-0" /> : null}
      {children}
    </span>
  )
}

export function ResourceDetailClient({
  resource,
  isOwner,
  orgSlug,
}: ResourceDetailClientProps) {
  const router = useRouter()
  const resourcesPath = `/${orgSlug}/resources`
  const ownerPath = `/${orgSlug}/user/${resource.owner.id}`
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const { setContext, clearSeed } = useAiPanel()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [title, setTitle] = useState(resource.title)
  const [description, setDescription] = useState(resource.description || "")
  const [resourceType, setResourceType] = useState(resource.resourceType || "other")
  const [pending, startTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInfo = getFileTypeInfo(resource.fileType)
  const FileTypeIcon = fileInfo.icon
  const resourceTypeLabel =
    RESOURCE_TYPES.find((rt) => rt.value === resource.resourceType)?.label ||
    resource.category ||
    "Resource"

  useEffect(() => {
    setPageTitle(resource.title)
    return () => setPageTitle(null)
  }, [resource.title, setPageTitle])

  useEffect(() => {
    document.title = `${resource.title} | UpClass`
  }, [resource.title])

  useEffect(() => {
    setContext({ surface: "resource", entityId: resource.id, label: resource.title })
    return () => clearSeed()
  }, [clearSeed, resource.id, resource.title, setContext])

  const handleOpenEdit = () => {
    setTitle(resource.title)
    setDescription(resource.description || "")
    setResourceType(resource.resourceType || "other")
    setError(null)
    setEditOpen(true)
  }

  const handleCloseEdit = () => {
    setEditOpen(false)
    setTitle(resource.title)
    setDescription(resource.description || "")
    setResourceType(resource.resourceType || "other")
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append("id", resource.id)
      formData.append("title", title)
      formData.append("description", description)
      formData.append("resourceType", resourceType)
      if (resource.classId) formData.append("classId", resource.classId)

      const result = await updateResource(formData)
      if (result.success) {
        setEditOpen(false)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  const handleDownload = () => {
    window.open(resource.fileUrl, "_blank")
  }

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteResource(resource.id)
      if (result.success) {
        setDeleteDialogOpen(false)
        router.push(resourcesPath)
        router.refresh()
      } else {
        setError(result.error)
        setDeleteDialogOpen(false)
      }
    })
  }

  return (
    <PageContainer width="wide" className="space-y-0 pb-safe-bottom pb-10 sm:space-y-0 sm:pb-10">

      {/* ── Top bar: Breadcrumb + Actions ────────────────────────────── */}
      <div className="mb-5 flex justify-end py-1 sm:mb-7">
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            variant="default"
            className="gap-1.5 rounded-md font-semibold shadow-2xs"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Download</span>
            <span className="inline sm:hidden">Get file</span>
          </Button>

          {isOwner ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-md shadow-2xs"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem onClick={handleOpenEdit}>
                  <Edit className="size-4" />
                  Edit resource
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Delete resource
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {/* ── Hero: identity + metadata strip ──────────────────────────── */}
      <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-start sm:gap-6">
        {/* File type badge */}
        <div className="shrink-0">
          <IconBadge tone={fileInfo.tone} size="xl" className="rounded-2xl shadow-e1">
            <FileTypeIcon className="size-7" />
          </IconBadge>
        </div>

        {/* Title block */}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="type-overline text-muted-foreground mb-1.5">{resourceTypeLabel}</p>
            <h1 className="type-h1 break-words leading-tight">{resource.title}</h1>
            {resource.description ? (
              <p className="mt-2 type-body break-words text-muted-foreground max-w-2xl whitespace-pre-wrap">
                {resource.description}
              </p>
            ) : null}
          </div>

          {/* Metadata strip */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Owner */}
            <Link
              href={ownerPath}
              className="touch-target inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground bg-surface-subtle/80 hover:bg-surface-raised hover:text-foreground transition-colors duration-150 group"
            >
              <EntityAvatar
                name={resource.owner.name}
                image={resource.owner.image}
                colorKey={resource.owner.id}
                size="xs"
              />
              <span className="group-hover:text-foreground transition-colors duration-150">
                {resource.owner.name}
              </span>
            </Link>

            {/* Format */}
            <StatusBadge tone={fileInfo.tone} className="font-bold text-[11px]">
              {resource.fileType.toUpperCase()}
            </StatusBadge>

            {/* File size */}
            <MetaPill icon={HardDrive}>
              {formatFileSize(resource.fileSize)}
            </MetaPill>

            {/* Upload date */}
            <MetaPill icon={Calendar}>
              {formatDateShort(resource.createdAt)}
            </MetaPill>

            {/* Linked class */}
            {resource.class ? (
              <Link
                href={`/${orgSlug}/classes/${resource.class.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-primary-text bg-primary-surface hover:bg-primary/20 transition-colors duration-150"
              >
                {resource.class.title}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Preview area ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-hairline/80 bg-card shadow-e1">
        {/* Floating header row */}
        <div className="flex items-center justify-between border-b border-hairline/70 bg-card/90 px-5 py-3 backdrop-blur-xs">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileTypeIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{resource.fileName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge tone={fileInfo.tone} className="font-bold text-[11px]">
              {resource.fileType.toUpperCase()}
            </StatusBadge>
          </div>
        </div>

        {/* Preview body */}
        {canPreview(resource.fileType) ? (
          <iframe
            src={resource.fileUrl}
            className="w-full border-0 bg-surface-sunken"
            style={{ minHeight: "calc(100dvh - 20rem)", height: "70vh" }}
            title={resource.fileName}
          />
        ) : (
          <div className="flex min-h-[20rem] flex-col items-center justify-center p-6 sm:min-h-[28rem] sm:p-8">
            <EmptyState
              icon={<FileTypeIcon className="size-8" />}
              tone={fileInfo.tone}
              title="Preview unavailable"
              description={`${fileInfo.label} files cannot be previewed directly in the browser.`}
            />
          </div>
        )}
      </div>

      {/* ── Edit Overlay ─────────────────────────────────────────────── */}
      <ResponsiveOverlay
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit resource"
        description="Update the title, description, or type."
        desktopClassName="sm:max-w-lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseEdit}
              disabled={pending}
              className="rounded-xl font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              isLoading={pending}
              disabled={!title.trim()}
              className="rounded-xl font-semibold shadow-2xs"
            >
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </>
        }
      >
        {error ? (
          <Callout tone="danger" role="alert" className="text-xs">
            {error}
          </Callout>
        ) : null}

        <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-resource-title" className="text-xs font-medium">Title</FieldLabel>
              <Input
                id="edit-resource-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Resource title"
                className="h-10 rounded-xl border-hairline/90 bg-surface/70 text-sm shadow-2xs focus-visible:bg-card"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-resource-type" className="text-xs font-medium">
                Resource Type
              </FieldLabel>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger
                  id="edit-resource-type"
                  className="h-10 rounded-xl border-hairline/90 bg-surface/70 text-sm shadow-2xs"
                >
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

            <Field>
              <FieldLabel htmlFor="edit-resource-description" optional className="text-xs font-medium">
                Description
              </FieldLabel>
              <Textarea
                id="edit-resource-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this resource covers"
                rows={4}
                className="resize-none rounded-xl border-hairline/90 bg-surface/70 text-sm shadow-2xs focus-visible:bg-card"
              />
            </Field>
          </FieldGroup>
      </ResponsiveOverlay>

      {/* ── Delete Dialog ─────────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>

          <Callout tone="danger" icon={<Trash2 className="size-4" />} className="text-xs">
            Are you sure you want to delete <strong>{resource.title}</strong> from UpClass?
          </Callout>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
              disabled={deletePending}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {deletePending ? "Deleting..." : "Delete resource"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
