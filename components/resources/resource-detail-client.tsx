"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Edit, FileText, Calendar, User, Tag, Bot } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { updateResource } from "@/app/actions/resources"
import { AIChatDialog } from "@/components/resources/ai-chat-dialog"

type ResourceData = {
  id: string
  title: string
  description: string | null
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
}

type ResourceDetailClientProps = {
  resource: ResourceData
  isOwner: boolean
  currentUserId: string
}

const getFileIcon = (fileType: string) => {
  if (fileType === "pdf") return "📄"
  if (fileType === "ppt" || fileType === "pptx") return "📊"
  if (fileType === "doc" || fileType === "docx") return "📝"
  if (fileType === "xls" || fileType === "xlsx") return "📈"
  if (fileType === "txt") return "📋"
  return "📎"
}

const formatFileSize = (size: string | null) => {
  if (!size) return "Unknown size"
  const bytes = parseInt(size)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const canPreview = (fileType: string) => {
  return fileType === "pdf" || fileType === "txt"
}

export function ResourceDetailClient({ resource, isOwner, currentUserId }: ResourceDetailClientProps) {
  const router = useRouter()
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const [editOpen, setEditOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [title, setTitle] = useState(resource.title)
  const [description, setDescription] = useState(resource.description || "")
  const [category, setCategory] = useState(resource.category || "General")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Set page title for breadcrumbs
  useEffect(() => {
    setPageTitle(resource.title)
    return () => setPageTitle(null)
  }, [resource.title, setPageTitle])

  const handleOpenEdit = () => {
    setTitle(resource.title)
    setDescription(resource.description || "")
    setCategory(resource.category || "General")
    setError(null)
    setEditOpen(true)
  }

  const handleCloseEdit = () => {
    setEditOpen(false)
    setTitle(resource.title)
    setDescription(resource.description || "")
    setCategory(resource.category || "General")
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append("id", resource.id)
      formData.append("title", title)
      formData.append("description", description)
      formData.append("category", category)

      const res = await updateResource(formData)
      if (res.success) {
        setEditOpen(false)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  const handleDownload = () => {
    window.open(resource.fileUrl, "_blank")
  }

  const handlePreview = () => {
    if (canPreview(resource.fileType)) {
      window.open(resource.fileUrl, "_blank")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const primaryColor = "#3b82f6" // Primary blue

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/home/resources">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{resource.title}</h1>
        </div>
        {isOwner && (
          <Button
            variant="outline"
            onClick={handleOpenEdit}
            style={{ borderColor: `${primaryColor}40` }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canPreview(resource.fileType) ? (
                <div className="aspect-video w-full rounded-lg border bg-muted overflow-hidden">
                  <iframe
                    src={resource.fileUrl}
                    className="w-full h-full"
                    title={resource.fileName}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center aspect-video rounded-lg border bg-muted">
                  <div className="text-6xl mb-4">{getFileIcon(resource.fileType)}</div>
                  <p className="text-muted-foreground mb-4">
                    Preview not available for {resource.fileType.toUpperCase()} files
                  </p>
                  <Button onClick={handleDownload} style={{ backgroundColor: primaryColor }}>
                    <Download className="h-4 w-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {resource.description || "No description provided."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">File:</span>
                </div>
                <p className="text-sm">{resource.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(resource.fileSize)} • {resource.fileType.toUpperCase()}
                </p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span className="font-medium">Category:</span>
                </div>
                <span
                  className="inline-block rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    borderColor: `${primaryColor}40`,
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }}
                >
                  {resource.category || "General"}
                </span>
              </div>

              {/* Owner */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Owner:</span>
                </div>
                <Link
                  href={`/home/user/${resource.owner.id}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={resource.owner.image || undefined} alt={resource.owner.name} />
                    <AvatarFallback className="text-xs" style={{ backgroundColor: primaryColor, color: "white" }}>
                      {getInitials(resource.owner.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{resource.owner.name}</p>
                    <p className="text-xs text-muted-foreground">{resource.owner.email}</p>
                  </div>
                </Link>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Created:</span>
                </div>
                <p className="text-xs">{formatDate(resource.createdAt)}</p>
                {resource.updatedAt !== resource.createdAt && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Updated:</span>
                    </div>
                    <p className="text-xs">{formatDate(resource.updatedAt)}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={handleDownload}
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {canPreview(resource.fileType) && (
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  className="w-full"
                  style={{ borderColor: `${primaryColor}40` }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Open Preview
                </Button>
              )}
              <Button
                onClick={() => setAiChatOpen(true)}
                variant="outline"
                className="w-full"
                style={{ borderColor: `${primaryColor}40` }}
              >
                <Bot className="h-4 w-4 mr-2" />
                Ask AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>
              Update the resource details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resource title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Lecture Notes, Assignments"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEdit}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={pending || !title.trim()}
              style={{ backgroundColor: primaryColor }}
            >
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Chat Dialog */}
      <AIChatDialog
        open={aiChatOpen}
        onOpenChange={setAiChatOpen}
        resourceContext={{
          title: resource.title,
          description: resource.description,
          category: resource.category,
          fileType: resource.fileType,
          fileName: resource.fileName,
        }}
      />
    </div>
  )
}

