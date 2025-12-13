"use client"

import { useState, useTransition, useRef } from "react"
import { Plus, Upload, X } from "lucide-react"

import { createResource } from "@/app/actions/resources"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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

type CreateResourceButtonProps = {
  iconOnly?: boolean
}

export function CreateResourceButton({ iconOnly = false }: CreateResourceButtonProps) {
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
          className={cn(
            buttonVariants({ size: iconOnly ? "icon" : "sm" }),
            iconOnly ? "h-9 w-9" : "gap-2",
            "shadow-sm transition-all hover:shadow-md"
          )}
          type="button"
          title="Create resource"
        >
          <Plus className="h-4 w-4" />
          {!iconOnly && <span>Create resource</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] gap-0 p-0 overflow-y-auto border-0 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-muted/50 to-muted/10 shrink-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">Upload New Resource</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share learning materials with your students.
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreate} className="p-6 space-y-6 flex-1 min-h-0">
          <div className="grid gap-5">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Resource File</Label>
                {selectedFile && (
                  <span className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                )}
              </div>

              {selectedFile ? (
                <div className="flex items-center justify-between rounded-xl border border-input bg-card/50 p-4 transition-all hover:bg-muted/40 group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">Ready to upload</span>
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
                    onChange={handleFileChange}
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="flex flex-col items-center justify-center text-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-200 group-hover:bg-background shadow-sm">
                      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium">Click to select a file</p>
                    <p className="text-xs text-muted-foreground">Support for PDF, DOC, PPT, XLS, TXT</p>
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
                  placeholder="e.g. Intro to Design"
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

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 animate-in fade-in slide-in-from-bottom-2">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
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
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || isUploading || !selectedFile}
              className={cn(buttonVariants(), "min-w-[100px] shadow-md hover:shadow-lg transition-all", (pending || isUploading) && "opacity-80")}
            >
              {pending || isUploading ? "Uploading..." : "Upload Resource"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

