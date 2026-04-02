"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, useTransition } from "react"
import {
  ArrowLeft,
  Bot,
  Calendar,
  Download,
  Edit,
  FileIcon as FileIconLucide,
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation,
  RefreshCw,
  Trash2,
} from "lucide-react"

import { deleteResource, reingestResource, updateResource } from "@/app/actions/resources"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { invalidateClassDetailCollections, invalidateResourceCollections } from "@/lib/query-invalidation"
import { getResourceAiStatusMeta } from "@/lib/resources/status"
import { cn } from "@/lib/utils"

const AIChatDialog = dynamic(
  () => import("@/components/resources/ai-chat-dialog").then((mod) => mod.AIChatDialog),
  {
    ssr: false,
  },
)

type ResourceDetailData = {
  id: string
  classId: string
  title: string
  description: string | null
  category: string | null
  fileUrl: string
  fileName: string
  fileType: string
  mimeType: string | null
  fileSize: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  class: {
    id: string
    title: string
    color: string | null
  }
  owner: {
    id: string
    name: string
    image: string | null
    email: string
  }
  aiStatus: "processing" | "ready" | "failed" | "unsupported"
  aiLastError: string | null
  aiChunkCount: number
  aiUpdatedAt: string | null
}

type ResourceDetailClientProps = {
  resource: ResourceDetailData
  canManageResource: boolean
}

const getFileTypeInfo = (type: string) => {
  const t = type.toLowerCase()
  if (t === "pdf") return { icon: FileText, bgColor: "bg-red-50", textColor: "text-red-600" }
  if (t === "doc" || t === "docx") {
    return { icon: FileText, bgColor: "bg-blue-50", textColor: "text-blue-600" }
  }
  if (t === "xls" || t === "xlsx" || t === "csv") {
    return { icon: FileSpreadsheet, bgColor: "bg-green-50", textColor: "text-green-600" }
  }
  if (t === "ppt" || t === "pptx") {
    return { icon: Presentation, bgColor: "bg-orange-50", textColor: "text-orange-600" }
  }
  if (t === "txt") return { icon: FileType, bgColor: "bg-gray-50", textColor: "text-gray-600" }
  return { icon: FileIconLucide, bgColor: "bg-gray-50", textColor: "text-gray-600" }
}

const formatFileSize = (size: string | null) => {
  if (!size) return "Unknown size"
  const bytes = Number.parseInt(size, 10)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const formatDate = (value: string | null) => {
  if (!value) return "Not available"
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const canPreview = (fileType: string) => fileType === "pdf" || fileType === "txt"

export function ResourceDetailClient({
  resource,
  canManageResource,
}: ResourceDetailClientProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { userId } = useMainShellState()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [title, setTitle] = useState(resource.title)
  const [description, setDescription] = useState(resource.description || "")
  const [category, setCategory] = useState(resource.category || "General")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [reingestPending, startReingestTransition] = useTransition()

  useEffect(() => {
    document.title = `${resource.title} | UpClass`
  }, [resource.title])

  const fileInfo = getFileTypeInfo(resource.fileType)
  const aiStatus = getResourceAiStatusMeta(resource.aiStatus)
  const aiCanAnswer = resource.aiStatus === "ready"

  const invalidateQueries = async () => {
    await invalidateResourceCollections(queryClient, userId)
    if (userId) {
      await invalidateClassDetailCollections(queryClient, {
        classId: resource.class.id,
        userId,
      })
    }
  }

  const handleSave = async () => {
    setError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("id", resource.id)
      formData.append("title", title)
      formData.append("description", description)
      formData.append("category", category)

      const result = await updateResource(formData)
      if (!result.success) {
        setError(result.error)
        return
      }

      setEditOpen(false)
      await invalidateQueries()
      router.refresh()
    })
  }

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteResource(resource.id)
      if (!result.success) {
        setError(result.error)
        return
      }

      await invalidateQueries()
      router.push(`/classes/${resource.class.id}?tab=resources`)
    })
  }

  const handleReingest = () => {
    setError(null)
    startReingestTransition(async () => {
      const result = await reingestResource(resource.id)
      if (!result.success) {
        setError(result.error)
        return
      }

      await invalidateQueries()
      router.refresh()
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/classes/${resource.class.id}?tab=resources`}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to {resource.class.title}
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">{resource.class.title}</p>
            <h1 className="text-3xl font-bold">{resource.title}</h1>
          </div>
        </div>

        {canManageResource ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {resource.aiStatus === "failed" ? (
              <Button
                variant="outline"
                onClick={handleReingest}
                isLoading={reingestPending}
              >
                {reingestPending ? null : <RefreshCw className="mr-2 h-4 w-4" />}
                Retry AI
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card className="overflow-hidden">
          <CardContent className={cn("p-3", fileInfo.bgColor)}>
            {canPreview(resource.fileType) ? (
              <div className="aspect-[4/3] overflow-hidden rounded-xl border bg-background">
                <iframe
                  src={resource.fileUrl}
                  title={resource.fileName}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-xl border bg-background/80 p-8 text-center">
                <div className={cn("rounded-3xl bg-white p-6 shadow-sm", fileInfo.textColor)}>
                  <fileInfo.icon className="h-16 w-16" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Preview not available</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Download the file to view this format.
                  </p>
                </div>
                <Button asChild>
                  <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download file
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>AI assistant</CardTitle>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    aiStatus.className,
                  )}
                >
                  {aiStatus.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {aiCanAnswer
                  ? "Ask questions grounded in this uploaded document."
                  : resource.aiStatus === "processing"
                    ? "The document is still being processed for AI retrieval."
                    : resource.aiStatus === "unsupported"
                      ? "This file type is uploaded successfully, but AI support is not available yet."
                      : "AI ingestion failed for this file."}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Chunks</p>
                  <p className="mt-1 font-semibold">{resource.aiChunkCount}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
                  <p className="mt-1 font-semibold text-xs">{formatDate(resource.aiUpdatedAt)}</p>
                </div>
              </div>

              {resource.aiLastError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {resource.aiLastError}
                </div>
              ) : null}

              <Button
                className="w-full"
                onClick={() => setAiChatOpen(true)}
                disabled={!aiCanAnswer}
              >
                <Bot className="mr-2 h-4 w-4" />
                Ask AI
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                <p className="mt-1 text-muted-foreground">
                  {resource.description || "No description provided."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">File</p>
                  <p className="mt-1 font-medium">{resource.fileName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                  <p className="mt-1 font-medium">{resource.fileType.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Size</p>
                  <p className="mt-1 font-medium">{formatFileSize(resource.fileSize)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Category</p>
                  <p className="mt-1 font-medium">{resource.category || "General"}</p>
                </div>
              </div>
              <div className="space-y-2 border-t pt-4 text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Uploaded {formatDate(resource.createdAt)}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Last updated {formatDate(resource.updatedAt)}
                </p>
              </div>
              <Button variant="outline" asChild className="w-full">
                <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download file
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit resource</DialogTitle>
            <DialogDescription>
              Update the resource metadata shown to your class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resource-title">Title</Label>
              <Input
                id="resource-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-category">Category</Label>
              <Input
                id="resource-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-description">Description</Label>
              <Textarea
                id="resource-description"
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={pending || !title.trim()}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete resource</DialogTitle>
            <DialogDescription>
              This removes the file, its AI embeddings, and its chat history.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{resource.title}</span> permanently?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePending}>
              {deletePending ? "Deleting..." : "Delete resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {aiChatOpen ? (
        <AIChatDialog
          open={aiChatOpen}
          onOpenChange={setAiChatOpen}
          classId={resource.class.id}
          resourceId={resource.id}
          resourceTitle={resource.title}
        />
      ) : null}
    </div>
  )
}
