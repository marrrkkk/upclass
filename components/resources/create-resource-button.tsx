"use client"

import { useState, useTransition, useRef } from "react"
import { Plus, Upload, X } from "lucide-react"

import { createResource } from "@/app/actions/resources"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"

export function CreateResourceButton() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload, isUploading } = useUploadThing("resourceUploader")

  const handleCreate = async (formData: FormData) => {
    setError(null)

    if (!selectedFile) {
      setError("Please select a file first")
      return
    }

    startTransition(async () => {
      try {
        // Upload file first
        const uploadResult = await startUpload([selectedFile])
        
        if (!uploadResult || !uploadResult[0]) {
          setError("Failed to upload file")
          return
        }

        const uploadedFile = uploadResult[0]
        const fileName = uploadedFile.name || selectedFile.name
        const fileExt = fileName.split(".").pop()?.toLowerCase() || ""
        
        // Map extension to file type
        const getFileType = (ext: string): string => {
          if (ext === "pdf") return "pdf"
          if (ext === "ppt") return "ppt"
          if (ext === "pptx") return "pptx"
          if (ext === "doc") return "doc"
          if (ext === "docx") return "docx"
          if (ext === "xls") return "xls"
          if (ext === "xlsx") return "xlsx"
          if (ext === "txt") return "txt"
          return "other"
        }

        // Append file data to form
        formData.append("fileUrl", uploadedFile.ufsUrl || uploadedFile.url || "")
        formData.append("fileName", fileName)
        formData.append("fileSize", uploadedFile.size?.toString() || selectedFile.size.toString())
        formData.append("fileType", getFileType(fileExt))

        // Create resource
        const res = await createResource(formData)
        if (!res.success) {
          setError(res.error)
          return
        }
        setOpen(false)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload file")
      }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(buttonVariants({ size: "sm" }), "gap-2 bg-blue-600 hover:bg-blue-700")}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Create resource
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload New Resource</DialogTitle>
          <DialogDescription>
            Upload a learning material file and add details about it.
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Title</span>
              <input
                name="title"
                required
                placeholder="e.g. Introduction to React"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Category</span>
              <input
                name="category"
                placeholder="e.g. Programming"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              />
            </label>
          </div>
          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Description</span>
            <textarea
              name="description"
              placeholder="Describe what this resource contains..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              rows={3}
            />
          </label>

          {/* File Upload */}
          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>File</span>
            {selectedFile ? (
              <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-input p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full cursor-pointer justify-center gap-2",
                  )}
                >
                  <Upload className="h-4 w-4" />
                  Choose file
                </label>
              </div>
            )}
          </label>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setSelectedFile(null)
                setError(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || isUploading || !selectedFile}
              className={cn(
                buttonVariants(),
                "bg-blue-600 hover:bg-blue-700 disabled:opacity-70",
              )}
            >
              {pending || isUploading ? "Uploading..." : "Create"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

