"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useState, useTransition, useRef } from "react"
import { Plus, Upload, X } from "lucide-react"

import { createResource } from "@/app/actions/resources"
import { useMainShellState } from "@/components/providers/main-shell-state-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { invalidateClassDetailCollections, invalidateResourceCollections } from "@/lib/query-invalidation"
import { useStorageUpload } from "@/lib/storage/client"
import { getResourceFileType } from "@/lib/storage/shared"
import { cn } from "@/lib/utils"
import type { ManagedClassOption } from "@/lib/main-app-queries"

type CreateResourceButtonProps = {
  iconOnly?: boolean
  classId?: string
  managedClasses?: ManagedClassOption[]
}

export function CreateResourceButton({
  iconOnly = false,
  classId,
  managedClasses = [],
}: CreateResourceButtonProps) {
  const queryClient = useQueryClient()
  const { userId } = useMainShellState()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedClassId, setSelectedClassId] = useState(classId ?? managedClasses[0]?.id ?? "")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useStorageUpload()

  const effectiveClassId = classId ?? selectedClassId
  const shouldShowClassSelect = !classId

  if (!classId && managedClasses.length === 0) {
    return null
  }

  const resetForm = () => {
    setSelectedFile(null)
    setError(null)
    if (!classId) {
      setSelectedClassId(managedClasses[0]?.id ?? "")
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleCreate = async (formData: FormData) => {
    setError(null)

    if (!selectedFile) {
      setError("Please select a file first")
      return
    }

    if (!effectiveClassId) {
      setError("Please select a class first")
      return
    }

    if (!navigator.onLine) {
      setError("You're offline. File uploads require an internet connection.")
      return
    }

    startTransition(async () => {
      try {
        const uploadResult = await startUpload({
          purpose: "resource-file",
          files: [selectedFile],
          context: {
            classId: effectiveClassId,
          },
        })

        if (!uploadResult[0]) {
          setError("Failed to upload file. Please try again.")
          return
        }

        const uploadedFile = uploadResult[0]
        const fileName = uploadedFile.name || selectedFile.name

        formData.append("classId", effectiveClassId)
        formData.append("fileName", fileName)
        formData.append("fileType", getResourceFileType(fileName))
        formData.append("mimeType", uploadedFile.type || selectedFile.type || "application/octet-stream")
        formData.append("fileSize", uploadedFile.size?.toString() || selectedFile.size.toString())
        formData.append("storageBucket", uploadedFile.bucket)
        formData.append("storagePath", uploadedFile.path)

        const result = await createResource(formData)
        if (!result.success) {
          setError(result.error)
          return
        }

        setOpen(false)
        resetForm()
        await invalidateResourceCollections(queryClient, userId)

        if (userId) {
          await invalidateClassDetailCollections(queryClient, {
            classId: effectiveClassId,
            userId,
          })
        }
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Failed to upload file")
      }
    })
  }

  const handleClose = () => {
    setOpen(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={iconOnly ? "icon" : "sm"}
          className={cn(iconOnly ? "" : "gap-2", "shadow-sm transition-all hover:shadow-md")}
          type="button"
          title="Upload resource"
        >
          <Plus className="h-4 w-4" />
          {!iconOnly ? <span>Upload resource</span> : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 shrink-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">Upload class resource</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload learning materials and prepare them for AI-assisted Q&amp;A.
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreate} className="p-6 space-y-6 flex-1 min-h-0">
          <div className="grid gap-5">
            {shouldShowClassSelect ? (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Class</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {managedClasses.map((managedClass) => (
                      <SelectItem key={managedClass.id} value={managedClass.id}>
                        {managedClass.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Resource file</Label>
                {selectedFile ? (
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                ) : null}
              </div>

              {selectedFile ? (
                <div className="flex items-center justify-between rounded-xl border border-input bg-card/50 p-4 transition-all hover:bg-muted/40 group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate max-w-[260px]">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        AI supports PDF, DOCX, and TXT right now
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                      }
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="relative rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 p-8 transition-all duration-200 cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        setSelectedFile(file)
                        setError(null)
                      }
                    }}
                    accept=".pdf,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="flex flex-col items-center justify-center text-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2 group-hover:bg-background shadow-sm">
                      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium">Click to select a file</p>
                    <p className="text-xs text-muted-foreground">
                      AI-ready today: PDF, DOCX, TXT. Other file types upload but stay AI unsupported.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Title</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Week 2 lecture notes"
                  className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Category</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="e.g. Lectures"
                  className="h-10 bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optional description about this resource..."
                rows={3}
                className="resize-none bg-muted/20 border-muted-foreground/20 focus-visible:bg-background transition-colors"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
              {error}
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={pending || isUploading}
              disabled={!selectedFile || !effectiveClassId}
              className="min-w-[120px]"
            >
              {pending || isUploading ? "Uploading..." : "Upload Resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
