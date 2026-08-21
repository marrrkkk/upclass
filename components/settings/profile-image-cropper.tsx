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

type ImageCropperProps = {
  imageSrc: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (croppedImage: Blob) => void
}

export function ImageCropper({ imageSrc, open, onOpenChange, onComplete }: ImageCropperProps) {
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
        setError("The profile image could not be processed.")
        return
      }
      onComplete(croppedImage)
      onOpenChange(false)
    } catch {
      setError("The profile image could not be processed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop profile picture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="relative h-72 w-full overflow-hidden rounded-lg border border-hairline bg-surface-sunken">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            ) : null}
          </div>
          <Field>
            <FieldLabel htmlFor="avatar-zoom" hint={`${zoom.toFixed(1)}×`}>
              Zoom
            </FieldLabel>
            <input
              id="avatar-zoom"
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

function getRadianAngle(degrees: number) {
  return (degrees * Math.PI) / 180
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return null

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))
  canvas.width = safeArea
  canvas.height = safeArea

  context.translate(safeArea / 2, safeArea / 2)
  context.rotate(getRadianAngle(rotation))
  context.translate(-safeArea / 2, -safeArea / 2)
  context.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5,
  )

  const data = context.getImageData(0, 0, safeArea, safeArea)
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  context.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y),
  )

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg")
  })
}
