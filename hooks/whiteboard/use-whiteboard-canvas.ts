"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"

import { drawSelectionHandles, isSelectableElement } from "@/components/whiteboard/whiteboard-utils"
import type {
  BoxElementData,
  DrawElementData,
  ImageElementData,
  LineElementData,
  TextElementData,
  WhiteboardElement,
  WhiteboardPoint,
} from "@/types/whiteboard"

type UseWhiteboardCanvasParams = {
  classColor: string
  elements: WhiteboardElement[]
  selectedElementId: string | null
}

export function useWhiteboardCanvas({
  classColor,
  elements,
  selectedElementId,
}: UseWhiteboardCanvasParams) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const animationFrameRef = useRef<number | null>(null)
  const pendingRedrawRef = useRef(false)
  const redrawCanvasRef = useRef<(() => void) | null>(null)

  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null
    return elements.find((element) => element.id === selectedElementId) ?? null
  }, [elements, selectedElementId])

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawElementData) => {
    if (path.points.length < 2) return

    ctx.strokeStyle = path.color
    ctx.lineWidth = path.width
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(path.points[0].x, path.points[0].y)

    const step = path.points.length > 100 ? Math.ceil(path.points.length / 100) : 1
    for (let index = step; index < path.points.length; index += step) {
      ctx.lineTo(path.points[index].x, path.points[index].y)
    }

    const lastPoint = path.points[path.points.length - 1]
    ctx.lineTo(lastPoint.x, lastPoint.y)
    ctx.stroke()
  }, [])

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, data: ImageElementData) => {
    if (!data.url) return

    const cachedImage = imageCacheRef.current.get(data.url)
    if (cachedImage?.complete) {
      ctx.drawImage(cachedImage, data.x, data.y, data.width, data.height)
      return
    }

    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => {
      imageCacheRef.current.set(data.url, image)
      redrawCanvasRef.current?.()
    }
    image.onerror = () => {
      ctx.fillStyle = "#f3f4f6"
      ctx.fillRect(data.x, data.y, data.width, data.height)
      ctx.strokeStyle = "#d1d5db"
      ctx.strokeRect(data.x, data.y, data.width, data.height)
    }
    image.src = data.url
  }, [])

  const drawText = useCallback((ctx: CanvasRenderingContext2D, data: TextElementData) => {
    ctx.fillStyle = data.color
    ctx.font = `${data.fontSize}px Arial`
    ctx.fillText(data.text, data.x, data.y)
  }, [])

  const drawRectangle = useCallback((ctx: CanvasRenderingContext2D, data: BoxElementData) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.strokeRect(data.x, data.y, data.width, data.height)
  }, [])

  const drawCircle = useCallback((ctx: CanvasRenderingContext2D, data: BoxElementData) => {
    const centerX = data.x + data.width / 2
    const centerY = data.y + data.height / 2
    const radius = Math.min(Math.abs(data.width), Math.abs(data.height)) / 2

    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()
  }, [])

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, data: LineElementData) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.beginPath()
    ctx.moveTo(data.x1, data.y1)
    ctx.lineTo(data.x2, data.y2)
    ctx.stroke()
  }, [])

  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, data: LineElementData) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.beginPath()
    ctx.moveTo(data.x1, data.y1)
    ctx.lineTo(data.x2, data.y2)
    ctx.stroke()

    const angle = Math.atan2(data.y2 - data.y1, data.x2 - data.x1)
    const arrowLength = 15
    const arrowAngle = Math.PI / 6

    ctx.beginPath()
    ctx.moveTo(data.x2, data.y2)
    ctx.lineTo(
      data.x2 - arrowLength * Math.cos(angle - arrowAngle),
      data.y2 - arrowLength * Math.sin(angle - arrowAngle),
    )
    ctx.moveTo(data.x2, data.y2)
    ctx.lineTo(
      data.x2 - arrowLength * Math.cos(angle + arrowAngle),
      data.y2 - arrowLength * Math.sin(angle + arrowAngle),
    )
    ctx.stroke()
  }, [])

  const filteredElements = useMemo(
    () => ({
      drawings: elements.filter((element) => element.type === "draw"),
      images: elements.filter((element) => element.type === "image"),
      texts: elements.filter((element) => element.type === "text"),
      shapes: elements.filter(
        (element) =>
          element.type === "rectangle" ||
          element.type === "circle" ||
          element.type === "line" ||
          element.type === "arrow",
      ),
    }),
    [elements],
  )

  const redrawCanvas = useCallback(() => {
    if (pendingRedrawRef.current) return
    pendingRedrawRef.current = true

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) {
        pendingRedrawRef.current = false
        return
      }

      const ctx = canvas.getContext("2d", { alpha: false })
      if (!ctx) {
        pendingRedrawRef.current = false
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      filteredElements.shapes.forEach((element) => {
        if (element.type === "rectangle") drawRectangle(ctx, element.data)
        if (element.type === "circle") drawCircle(ctx, element.data)
        if (element.type === "line") drawLine(ctx, element.data)
        if (element.type === "arrow") drawArrow(ctx, element.data)
      })

      filteredElements.images.forEach((element) => drawImage(ctx, element.data))
      filteredElements.texts.forEach((element) => drawText(ctx, element.data))
      filteredElements.drawings.forEach((element) => drawPath(ctx, element.data))

      if (selectedElement && isSelectableElement(selectedElement)) {
        drawSelectionHandles(ctx, selectedElement, classColor)
      }

      pendingRedrawRef.current = false
    })
  }, [
    classColor,
    drawArrow,
    drawCircle,
    drawImage,
    drawLine,
    drawPath,
    drawRectangle,
    drawText,
    filteredElements,
    selectedElement,
  ])

  useEffect(() => {
    redrawCanvasRef.current = redrawCanvas
  }, [redrawCanvas])

  useEffect(() => {
    const imageElements = elements.filter((element) => element.type === "image")
    imageElements.forEach((element) => {
      if (!element.data.url || imageCacheRef.current.has(element.data.url)) return

      const image = new Image()
      image.crossOrigin = "anonymous"
      image.onload = () => {
        imageCacheRef.current.set(element.data.url, image)
        redrawCanvasRef.current?.()
      }
      image.src = element.data.url
    })
  }, [elements])

  useEffect(() => {
    const timeout = setTimeout(() => redrawCanvas(), 16)
    return () => clearTimeout(timeout)
  }, [redrawCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      redrawCanvasRef.current?.()
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(container)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const getMousePos = useCallback((event: React.MouseEvent<HTMLCanvasElement>): WhiteboardPoint => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }, [])

  const getTouchPos = useCallback((event: React.TouchEvent<HTMLCanvasElement>): WhiteboardPoint => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const touch = event.touches[0] || event.changedTouches[0]
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }
  }, [])

  return {
    canvasRef,
    containerRef,
    imageCacheRef,
    getMousePos,
    getTouchPos,
  }
}
