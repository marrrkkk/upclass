"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ImageViewerDialogProps = {
  images: string[]
  currentIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageViewerDialog({ images, currentIndex, open, onOpenChange }: ImageViewerDialogProps) {
  const [index, setIndex] = useState(currentIndex)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => {
      setIndex(currentIndex)
    }, 0)
    return () => window.clearTimeout(id)
  }, [open, currentIndex])

  const handlePrevious = () => {
    setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>View Image</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <button
            onClick={() => onOpenChange(false)}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "absolute top-2 right-2 z-10"
            )}
          >
            <X className="h-5 w-5" />
          </button>
          
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          
          <img
            src={images[index]}
            alt={`Image ${index + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
          
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {index + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

