"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Point = { x: number; y: number }
type Area = { x: number; y: number; width: number; height: number }

interface CoverCropperProps {
    imageSrc: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: (croppedImageBlob: Blob) => void
}

export function CoverCropper({ imageSrc, open, onOpenChange, onComplete }: CoverCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [loading, setLoading] = useState(false)

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const createCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return

        setLoading(true)
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
            if (croppedImage) {
                onComplete(croppedImage)
                onOpenChange(false)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Cover Photo</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="relative h-[250px] w-full bg-black/5 rounded-md overflow-hidden">
                        {imageSrc && (
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
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={createCroppedImage} disabled={loading}>
                        {loading ? "Processing..." : "Apply"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Helper function to create the cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener("load", () => resolve(image))
        image.addEventListener("error", (error) => reject(error))
        image.setAttribute("crossOrigin", "anonymous")
        image.src = url
    })

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area
): Promise<Blob | null> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
        return null
    }

    // Set canvas size to the cropped area
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Draw the cropped image
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    )

    // As Blob
    return new Promise((resolve) => {
        canvas.toBlob((file) => {
            resolve(file)
        }, "image/jpeg", 0.9)
    })
}
