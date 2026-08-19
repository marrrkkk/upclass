"use client"

import * as React from "react"
import Cropper from "react-easy-crop"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"

type Point = { x: number; y: number }
type Area = { x: number; y: number; width: number; height: number }

type CoverCropperProps = {
  imageSrc: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (croppedImageBlob: Blob) => void
}

export function CoverCropper({ imageSrc, open, onOpenChange, onComplete }: CoverCropperProps) {
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onCropComplete = React.useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const createCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setLoading(true)
    setError(null)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (!croppedImage) {
        setError("The cover image could not be processed.")
        return
      }
      onComplete(croppedImage)
      onOpenChange(false)
    } catch {
      setError("The cover image could not be processed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop cover image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="relative h-64 w-full overflow-hidden rounded-lg border border-hairline bg-surface-sunken">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 5}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="rect"
                showGrid={false}
              />
            ) : null}
          </div>
          <Field>
            <FieldLabel htmlFor="cover-zoom" hint={`${zoom.toFixed(1)}×`}>
              Zoom
            </FieldLabel>
            <input
              id="cover-zoom"
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </Field>
          {error ? (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={createCroppedImage} isLoading={loading}>
            {loading ? "Processing" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", reject)
    image.setAttribute("crossOrigin", "anonymous")
    image.src = url
  })

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return null

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  })
}
