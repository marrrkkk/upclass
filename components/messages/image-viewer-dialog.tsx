"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/status-badge"

type ImageViewerDialogProps = {
  images: string[]
  currentIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageViewerDialog({
  images,
  currentIndex,
  open,
  onOpenChange,
}: ImageViewerDialogProps) {
  const [index, setIndex] = useState(currentIndex)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => {
      setIndex(currentIndex)
    }, 0)
    return () => window.clearTimeout(id)
  }, [open, currentIndex])

  const handlePrevious = () => {
    setIndex((previous) => (previous > 0 ? previous - 1 : images.length - 1))
  }

  const handleNext = () => {
    setIndex((previous) => (previous < images.length - 1 ? previous + 1 : 0))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl overflow-hidden rounded-2xl border border-hairline/80 bg-background/95 p-0 shadow-2xl backdrop-blur-md">
        <DialogHeader className="sr-only">
          <DialogTitle>View attachment</DialogTitle>
        </DialogHeader>
        <div className="relative flex min-h-72 items-center justify-center bg-black/5 p-4 dark:bg-black/40">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close image viewer"
            className="absolute right-3.5 top-3.5 z-10 size-8 rounded-full border-hairline bg-card/80 backdrop-blur-xs hover:bg-card shadow-xs"
          >
            <X className="size-4" />
          </Button>

          {images.length > 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                aria-label="Previous image"
                className="absolute left-3.5 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full border-hairline bg-card/80 backdrop-blur-xs hover:bg-card shadow-xs"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleNext}
                aria-label="Next image"
                className="absolute right-3.5 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full border-hairline bg-card/80 backdrop-blur-xs hover:bg-card shadow-xs"
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          ) : null}

          <img
            src={images[index]}
            alt={`Attachment ${index + 1}`}
            className="max-h-[80dvh] h-auto w-full rounded-lg object-contain"
          />

          {images.length > 1 ? (
            <StatusBadge
              tone="neutral"
              className="absolute bottom-3.5 left-1/2 -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 font-medium shadow-xs backdrop-blur-xs"
            >
              {index + 1} of {images.length}
            </StatusBadge>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
