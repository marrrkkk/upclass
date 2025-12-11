"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Edit,
  FileText,
  Calendar,
  User,
  Tag,
  Bot,
  FileCode,
  FileSpreadsheet,
  Presentation,
  FileIcon as FileIconLucide,
  FileType,
  Trash2
} from "lucide-react"
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
import { buttonVariants } from "@/components/ui/button"
import { updateResource, deleteResource } from "@/app/actions/resources"
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
  currentUserId?: string
  isAuthenticated?: boolean
}

const getFileTypeInfo = (type: string) => {
  const t = type.toLowerCase()
  if (t === 'pdf') return { icon: FileText, bgColor: 'bg-red-50', textColor: 'text-red-600' }
  if (t === 'doc' || t === 'docx') return { icon: FileText, bgColor: 'bg-blue-50', textColor: 'text-blue-600' }
  if (t === 'xls' || t === 'xlsx' || t === 'csv') return { icon: FileSpreadsheet, bgColor: 'bg-green-50', textColor: 'text-green-600' }
  if (t === 'ppt' || t === 'pptx') return { icon: Presentation, bgColor: 'bg-orange-50', textColor: 'text-orange-600' }
  if (t === 'txt') return { icon: FileType, bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
  return { icon: FileIconLucide, bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
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

export function ResourceDetailClient({ resource, isOwner, currentUserId, isAuthenticated = false }: ResourceDetailClientProps) {
  const router = useRouter()
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [title, setTitle] = useState(resource.title)
  const [description, setDescription] = useState(resource.description || "")
  const [category, setCategory] = useState(resource.category || "General")
  const [pending, startTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Determine styles based on file type
  const fileInfo = getFileTypeInfo(resource.fileType)

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

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteResource(resource.id)
      if (res.success) {
        setDeleteDialogOpen(false)
        router.push("/home/resources")
      } else {
        setError(res.error)
        setDeleteDialogOpen(false)
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

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header Back Link */}
      <div>
        <Link
          href="/home/resources"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to resources
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Preview & File Visual */}
        <div className="lg:col-span-2 space-y-6">
          <div className={cn("relative overflow-hidden rounded-2xl border bg-card shadow-sm group", fileInfo.bgColor)}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:24px_24px] [color:inherit]" />

            {/* Preview Content */}
            <div className="relative z-10 p-1">
              {canPreview(resource.fileType) ? (
                <div className="aspect-[4/3] w-full rounded-xl bg-background shadow-inner overflow-hidden border">
                  <iframe
                    src={resource.fileUrl}
                    className="w-full h-full"
                    title={resource.fileName}
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] w-full flex flex-col items-center justify-center text-center p-12">
                  <div className={cn("p-8 rounded-3xl bg-white/30 backdrop-blur-md shadow-lg mb-6 transform transition-transform group-hover:scale-105", fileInfo.textColor)}>
                    <fileInfo.icon className="h-24 w-24" />
                  </div>
                  <h3 className="text-xl font-semibold opacity-90 mb-2">
                    Preview not available
                  </h3>
                  <p className="text-muted-foreground max-w-xs mx-auto mb-8">
                    This file type ({resource.fileType.toUpperCase()}) cannot be previewed in the browser.
                  </p>
                  <Button
                    onClick={handleDownload}
                    size="lg"
                    className="rounded-full shadow-lg hover:shadow-xl transition-all"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details & Actions */}
        <div className="space-y-6">
          {/* Header Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold leading-tight decoration-clone bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {resource.title}
              </h1>
              {isOwner && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleOpenEdit}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={cn("px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider", fileInfo.bgColor, fileInfo.textColor)}
              >
                {resource.fileType}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {formatFileSize(resource.fileSize)}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                {resource.category || "General"}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="prose prose-sm text-muted-foreground max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed">
              {resource.description || "No description provided for this resource."}
            </p>
          </div>

          {/* Actions */}
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-card to-secondary/20">
            <CardContent className="p-0">
              <div className="flex flex-col">
                <button
                  onClick={() => setAiChatOpen(true)}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left group border-b border-border/50"
                >
                  <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold block text-base group-hover:text-primary transition-colors">Ask AI Assistant</span>
                    <span className="text-xs text-muted-foreground">Summarize, question, or analyze this file</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold block text-base group-hover:text-primary transition-colors">Download File</span>
                    <span className="text-xs text-muted-foreground">Save to your device</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <div className="rounded-xl bg-muted/30 p-4 space-y-4 border border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-background shadow-sm">
                <AvatarImage src={resource.owner.image || undefined} alt={resource.owner.name} />
                <AvatarFallback>{getInitials(resource.owner.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{resource.owner.name}</p>
                <p className="text-xs text-muted-foreground truncate">{resource.owner.email}</p>
              </div>
            </div>

            <div className="h-px bg-border/50" />

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Created</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(resource.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Updated</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(resource.updatedAt)}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Dialog - Kept similar functional logic but ensured improved visuals */}
      {/* Edit Dialog - Premium UI */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
          <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 border-b border-border/50">
            <DialogTitle className="text-xl font-semibold tracking-tight">Edit Resource</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the resource details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="px-6 pt-4">
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
                {error}
              </div>
            </div>
          )}

          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resource title"
                className="h-11 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={6}
                className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Category</Label>
              <Input
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Lecture Notes, Assignments"
                className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-muted/30 border-t backdrop-blur-sm">
            <Button
              variant="ghost"
              onClick={handleCloseEdit}
              disabled={pending}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={pending || !title.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all px-6"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)]">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border-b border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Delete Resource</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete
            </p>
            <p className="text-lg font-semibold text-foreground truncate">
              "{resource.title}"
            </p>
            <p className="text-xs text-muted-foreground">
              The file and all associated data will be permanently removed.
            </p>
          </div>

          <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePending}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePending}
              className="min-w-[120px] gap-2"
            >
              {deletePending ? (
                "Deleting..."
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}



