"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  PenTool,
  Image as ImageIcon,
  Type,
  Trash2,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Maximize,
  Minimize,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateWhiteboard } from "@/app/actions/whiteboard"
import { useUploadThing } from "@/lib/uploadthing"
import { SyncManager } from "@/lib/sync-manager"

type WhiteboardElement = {
  id: string
  type: "draw" | "image" | "text" | "rectangle" | "circle" | "line" | "arrow"
  data: any
  userId: string
  createdAt: number
}

type CursorData = {
  userId: string
  x: number
  y: number
  user: {
    id: string
    name: string
    image: string | null
  }
}

type SelectionState = {
  elementId: string | null
  isDragging: boolean
  isResizing: boolean
  resizeHandle: string | null
  dragStart: { x: number; y: number } | null
}

type WhiteboardClientProps = {
  whiteboardId: string
  classId: string
  className: string
  classColor: string
  initialData: string
  currentUser: {
    id: string
    name: string
    image: string | null
  }
  members: Array<{
    id: string
    name: string
    image: string | null
  }>
}

export function WhiteboardClient({
  whiteboardId,
  classId,
  className,
  classColor,
  initialData,
  currentUser,
  members,
}: WhiteboardClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [elements, setElements] = useState<WhiteboardElement[]>(
    initialData ? JSON.parse(initialData) : []
  )
  const [tool, setTool] = useState<"draw" | "image" | "text" | "eraser" | "rectangle" | "circle" | "line" | "arrow" | "select">("draw")
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState("#000000")
  const [lineWidth, setLineWidth] = useState(3)
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map())
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null)
  const [textValue, setTextValue] = useState("")
  const [textFontSize, setTextFontSize] = useState(20)
  const [selection, setSelection] = useState<SelectionState>({
    elementId: null,
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    dragStart: null,
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload } = useUploadThing("imageUploader")
  const lastUpdateRef = useRef<number>(0)
  const broadcastChannelRef = useRef<any>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const pendingRedrawRef = useRef<boolean>(false)
  const broadcastQueueRef = useRef<any[]>([])
  const broadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const redrawCanvasRef = useRef<(() => void) | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth
        canvas.height = containerRef.current.clientHeight
        // Use ref to call redrawCanvas if available
        if (redrawCanvasRef.current) {
          redrawCanvasRef.current()
        }
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  // Drawing functions - optimized (defined first)
  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: { points: Array<{ x: number; y: number }>; color: string; width: number }) => {
    if (path.points.length < 2) return

    ctx.strokeStyle = path.color
    ctx.lineWidth = path.width
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    ctx.beginPath()
    ctx.moveTo(path.points[0].x, path.points[0].y)

    // Optimize: only draw every nth point for very long paths
    const step = path.points.length > 100 ? Math.ceil(path.points.length / 100) : 1
    for (let i = step; i < path.points.length; i += step) {
      ctx.lineTo(path.points[i].x, path.points[i].y)
    }

    // Always draw the last point
    if (path.points.length > 1) {
      const lastPoint = path.points[path.points.length - 1]
      ctx.lineTo(lastPoint.x, lastPoint.y)
    }

    ctx.stroke()
  }, [])

  // Image cache for performance
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())

  // Preload images when elements change
  useEffect(() => {
    const imageElements = elements.filter(e => e.type === "image")
    imageElements.forEach(element => {
      const url = element.data.url
      if (url && !imageCacheRef.current.has(url)) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          imageCacheRef.current.set(url, img)
          // Trigger redraw when image loads
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current()
          }
        }
        img.onerror = () => {
          console.error("Failed to load image:", url)
        }
        img.src = url
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements])

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, data: { url: string; x: number; y: number; width: number; height: number }) => {
    if (!data.url) return
    
    const cachedImg = imageCacheRef.current.get(data.url)
    if (cachedImg && cachedImg.complete) {
      ctx.drawImage(cachedImg, data.x, data.y, data.width, data.height)
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imageCacheRef.current.set(data.url, img)
      ctx.drawImage(img, data.x, data.y, data.width, data.height)
      // Trigger redraw when image loads using ref to avoid circular dependency
      if (redrawCanvasRef.current) {
        redrawCanvasRef.current()
      }
    }
    img.onerror = () => {
      // Draw placeholder on error
      ctx.fillStyle = "#f3f4f6"
      ctx.fillRect(data.x, data.y, data.width, data.height)
      ctx.strokeStyle = "#d1d5db"
      ctx.strokeRect(data.x, data.y, data.width, data.height)
    }
    img.src = data.url
  }, [])

  const drawText = useCallback((ctx: CanvasRenderingContext2D, data: { text: string; x: number; y: number; color: string; fontSize: number }) => {
    ctx.fillStyle = data.color
    ctx.font = `${data.fontSize}px Arial`
    ctx.fillText(data.text, data.x, data.y)
  }, [])

  const drawRectangle = useCallback((ctx: CanvasRenderingContext2D, data: { x: number; y: number; width: number; height: number; color: string; lineWidth: number }) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.strokeRect(data.x, data.y, data.width, data.height)
  }, [])

  const drawCircle = useCallback((ctx: CanvasRenderingContext2D, data: { x: number; y: number; width: number; height: number; color: string; lineWidth: number }) => {
    const centerX = data.x + data.width / 2
    const centerY = data.y + data.height / 2
    const radius = Math.min(Math.abs(data.width), Math.abs(data.height)) / 2

    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()
  }, [])

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, data: { x1: number; y1: number; x2: number; y2: number; color: string; lineWidth: number }) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.beginPath()
    ctx.moveTo(data.x1, data.y1)
    ctx.lineTo(data.x2, data.y2)
    ctx.stroke()
  }, [])

  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, data: { x1: number; y1: number; x2: number; y2: number; color: string; lineWidth: number }) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.beginPath()
    ctx.moveTo(data.x1, data.y1)
    ctx.lineTo(data.x2, data.y2)
    ctx.stroke()

    // Draw arrowhead
    const angle = Math.atan2(data.y2 - data.y1, data.x2 - data.x1)
    const arrowLength = 15
    const arrowAngle = Math.PI / 6

    ctx.beginPath()
    ctx.moveTo(data.x2, data.y2)
    ctx.lineTo(
      data.x2 - arrowLength * Math.cos(angle - arrowAngle),
      data.y2 - arrowLength * Math.sin(angle - arrowAngle)
    )
    ctx.moveTo(data.x2, data.y2)
    ctx.lineTo(
      data.x2 - arrowLength * Math.cos(angle + arrowAngle),
      data.y2 - arrowLength * Math.sin(angle + arrowAngle)
    )
    ctx.stroke()
  }, [])

  // Memoize filtered elements to avoid recalculation on every render
  const filteredElements = useMemo(() => {
    return {
      shapes: elements.filter(e => e.type === "rectangle" || e.type === "circle" || e.type === "line" || e.type === "arrow"),
      images: elements.filter(e => e.type === "image"),
      texts: elements.filter(e => e.type === "text"),
      drawings: elements.filter(e => e.type === "draw"),
    }
  }, [elements])

  // Memoize selected element
  const selectedElement = useMemo(() => {
    if (!selection.elementId) return null
    return elements.find((e) => e.id === selection.elementId) || null
  }, [elements, selection.elementId])

  // Optimized redraw with requestAnimationFrame
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

      // Use memoized filtered elements
      const { shapes, images, texts, drawings } = filteredElements

      shapes.forEach((element) => {
        if (element.type === "rectangle") {
          drawRectangle(ctx, element.data)
        } else if (element.type === "circle") {
          drawCircle(ctx, element.data)
        } else if (element.type === "line") {
          drawLine(ctx, element.data)
        } else if (element.type === "arrow") {
          drawArrow(ctx, element.data)
        }
      })

      images.forEach((element) => {
        drawImage(ctx, element.data)
      })

      texts.forEach((element) => {
        drawText(ctx, element.data)
      })

      drawings.forEach((element) => {
        drawPath(ctx, element.data)
      })

      // Draw selection handles
      if (selectedElement && (selectedElement.type === "image" || selectedElement.type === "text" || selectedElement.type === "rectangle" || selectedElement.type === "circle" || selectedElement.type === "line" || selectedElement.type === "arrow")) {
        drawSelectionHandles(ctx, selectedElement)
      }

      pendingRedrawRef.current = false
    })
  }, [filteredElements, selectedElement, drawPath, drawImage, drawText, drawRectangle, drawCircle, drawLine, drawArrow])

  // Store redrawCanvas in ref so it can be called from drawImage
  useEffect(() => {
    redrawCanvasRef.current = redrawCanvas
  }, [redrawCanvas])

  // Only redraw when necessary - avoid continuous re-renders
  useEffect(() => {
    // Use a small delay to batch multiple updates
    const timeout = setTimeout(() => {
      redrawCanvas()
    }, 16) // ~60fps
    
    return () => clearTimeout(timeout)
  }, [redrawCanvas])

  // Ensure canvas is properly sized and redrawn after initialization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !containerRef.current) return
    
    const resizeAndRedraw = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth
        canvas.height = containerRef.current.clientHeight
        
        // Trigger redraw
        if (redrawCanvasRef.current) {
          redrawCanvasRef.current()
        } else {
          // If redrawCanvas isn't ready yet, try again after a short delay
          setTimeout(() => {
            if (redrawCanvasRef.current) {
              redrawCanvasRef.current()
            }
          }, 50)
        }
      }
    }
    
    // Initial resize and redraw
    resizeAndRedraw()
    
    // Also listen for container size changes
    const resizeObserver = new ResizeObserver(() => {
      resizeAndRedraw()
    })
    
    resizeObserver.observe(containerRef.current)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, element: WhiteboardElement) => {
    ctx.strokeStyle = classColor
    ctx.fillStyle = "white"
    ctx.lineWidth = 2
    const handleSize = 8

    if (element.type === "image" || element.type === "rectangle" || element.type === "circle") {
      const { x, y, width, height } = element.data
      const minX = Math.min(x, x + width)
      const maxX = Math.max(x, x + width)
      const minY = Math.min(y, y + height)
      const maxY = Math.max(y, y + height)

      // Corner handles
      const handles = [
        { x: minX, y: minY }, // top-left
        { x: maxX, y: minY }, // top-right
        { x: maxX, y: maxY }, // bottom-right
        { x: minX, y: maxY }, // bottom-left
      ]

      handles.forEach((handle) => {
        ctx.beginPath()
        ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        ctx.fill()
        ctx.stroke()
      })
    } else if (element.type === "text") {
      const { x, y, fontSize, text } = element.data
      ctx.font = `${fontSize}px Arial`
      const metrics = ctx.measureText(text)
      const width = metrics.width
      const height = fontSize

      const handles = [
        { x, y }, // top-left
        { x: x + width, y }, // top-right
        { x: x + width, y: y + height }, // bottom-right
        { x, y: y + height }, // bottom-left
      ]

      handles.forEach((handle) => {
        ctx.beginPath()
        ctx.rect(handle.x - 4, handle.y - 4, 8, 8)
        ctx.fill()
        ctx.stroke()
      })
    } else if (element.type === "line" || element.type === "arrow") {
      const { x1, y1, x2, y2 } = element.data
      const handles = [
        { x: x1, y: y1 }, // start
        { x: x2, y: y2 }, // end
      ]

      handles.forEach((handle) => {
        ctx.beginPath()
        ctx.arc(handle.x, handle.y, handleSize / 2, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
      })
    }
  }

  // Mouse and touch events
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0] || e.changedTouches[0]
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }
  }

  const getElementAt = (x: number, y: number): WhiteboardElement | null => {
    // Check in reverse order (top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      if (element.type === "image") {
        const { x: ex, y: ey, width, height } = element.data
        if (x >= ex && x <= ex + width && y >= ey && y <= ey + height) {
          return element
        }
      } else if (element.type === "text") {
        const { x: ex, y: ey, fontSize, text } = element.data
        const canvas = canvasRef.current
        if (!canvas) continue
        const ctx = canvas.getContext("2d")
        if (!ctx) continue
        ctx.font = `${fontSize}px Arial`
        const metrics = ctx.measureText(text)
        const width = metrics.width
        const height = fontSize
        if (x >= ex && x <= ex + width && y >= ey && y <= ey + height) {
          return element
        }
      } else if (element.type === "rectangle" || element.type === "circle") {
        const { x: ex, y: ey, width, height } = element.data
        const minX = Math.min(ex, ex + width)
        const maxX = Math.max(ex, ex + width)
        const minY = Math.min(ey, ey + height)
        const maxY = Math.max(ey, ey + height)
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return element
        }
      } else if (element.type === "line" || element.type === "arrow") {
        const { x1, y1, x2, y2, lineWidth } = element.data
        const dist = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2))
        if (dist <= (lineWidth || 3) + 5) {
          const minX = Math.min(x1, x2)
          const maxX = Math.max(x1, x2)
          const minY = Math.min(y1, y2)
          const maxY = Math.max(y1, y2)
          if (x >= minX - 10 && x <= maxX + 10 && y >= minY - 10 && y <= maxY + 10) {
            return element
          }
        }
      }
    }
    return null
  }

  const getResizeHandle = (x: number, y: number, element: WhiteboardElement): string | null => {
    if (element.type === "image") {
      const { x: ex, y: ey, width, height } = element.data
      const handleSize = 8
      const threshold = handleSize + 4

      if (Math.abs(x - ex) < threshold && Math.abs(y - ey) < threshold) return "nw"
      if (Math.abs(x - (ex + width)) < threshold && Math.abs(y - ey) < threshold) return "ne"
      if (Math.abs(x - (ex + width)) < threshold && Math.abs(y - (ey + height)) < threshold) return "se"
      if (Math.abs(x - ex) < threshold && Math.abs(y - (ey + height)) < threshold) return "sw"
    } else if (element.type === "text") {
      const { x: ex, y: ey, fontSize, text } = element.data
      const canvas = canvasRef.current
      if (!canvas) return null
      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.font = `${fontSize}px Arial`
      const metrics = ctx.measureText(text)
      const width = metrics.width
      const height = fontSize
      const threshold = 8

      if (Math.abs(x - ex) < threshold && Math.abs(y - ey) < threshold) return "nw"
      if (Math.abs(x - (ex + width)) < threshold && Math.abs(y - ey) < threshold) return "ne"
      if (Math.abs(x - (ex + width)) < threshold && Math.abs(y - (ey + height)) < threshold) return "se"
      if (Math.abs(x - ex) < threshold && Math.abs(y - (ey + height)) < threshold) return "sw"
    } else if (element.type === "rectangle" || element.type === "circle") {
      const { x: ex, y: ey, width, height } = element.data
      const minX = Math.min(ex, ex + width)
      const maxX = Math.max(ex, ex + width)
      const minY = Math.min(ey, ey + height)
      const maxY = Math.max(ey, ey + height)
      const threshold = 8

      if (Math.abs(x - minX) < threshold && Math.abs(y - minY) < threshold) return "nw"
      if (Math.abs(x - maxX) < threshold && Math.abs(y - minY) < threshold) return "ne"
      if (Math.abs(x - maxX) < threshold && Math.abs(y - maxY) < threshold) return "se"
      if (Math.abs(x - minX) < threshold && Math.abs(y - maxY) < threshold) return "sw"
    } else if (element.type === "line" || element.type === "arrow") {
      const { x1, y1, x2, y2 } = element.data
      const threshold = 8
      if (Math.abs(x - x1) < threshold && Math.abs(y - y1) < threshold) return "start"
      if (Math.abs(x - x2) < threshold && Math.abs(y - y2) < threshold) return "end"
    }
    return null
  }

  const handlePointerDown = (pos: { x: number; y: number }) => {
    if (tool === "select") {
      const element = getElementAt(pos.x, pos.y)
      if (element && (element.type === "image" || element.type === "text" || element.type === "rectangle" || element.type === "circle" || element.type === "line" || element.type === "arrow")) {
        const handle = getResizeHandle(pos.x, pos.y, element)
        if (handle) {
          setSelection({
            elementId: element.id,
            isDragging: false,
            isResizing: true,
            resizeHandle: handle,
            dragStart: pos,
          })
        } else {
          setSelection({
            elementId: element.id,
            isDragging: true,
            isResizing: false,
            resizeHandle: null,
            dragStart: pos,
          })
        }
      } else {
        setSelection({
          elementId: null,
          isDragging: false,
          isResizing: false,
          resizeHandle: null,
          dragStart: null,
        })
      }
    } else if (tool === "draw") {
      setIsDrawing(true)
      const newElement: WhiteboardElement = {
        id: crypto.randomUUID(),
        type: "draw",
        data: {
          points: [pos],
          color,
          width: lineWidth,
        },
        userId: currentUser.id,
        createdAt: Date.now(),
      }
      setElements((prev) => [...prev, newElement])

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "drawing-start",
          payload: { element: newElement },
        })
      }
    } else if (tool === "eraser") {
      // Erase elements at this position
      const elementToErase = getElementAt(pos.x, pos.y)
      if (elementToErase) {
        setElements((prev) => prev.filter((el) => el.id !== elementToErase.id))
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "element-remove",
            payload: { elementId: elementToErase.id },
          })
        }
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(() => {
          saveWhiteboard()
        }, 500)
      }
    } else if (tool === "text") {
      setTextInput(pos)
      setTextValue("")
      setTextFontSize(20)
    } else if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
      setShapeStart(pos)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getMousePos(e)
    handlePointerDown(pos)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getTouchPos(e)
    handlePointerDown(pos)
  }

  const handlePointerMove = (pos: { x: number; y: number }) => {
    // Throttle cursor updates to reduce network traffic (100ms instead of 50ms)
    const now = Date.now()
    if (now - lastUpdateRef.current > 100) {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "cursor-move",
          payload: {
            userId: currentUser.id,
            x: pos.x,
            y: pos.y,
            user: currentUser,
          },
        })
      }
      lastUpdateRef.current = now
    }

    if (tool === "select" && selection.elementId && selection.dragStart) {
      const element = elements.find((e) => e.id === selection.elementId)
      if (!element) return

      if (selection.isResizing) {
        const dx = pos.x - selection.dragStart.x
        const dy = pos.y - selection.dragStart.y

        setElements((prev) => {
          return prev.map((el) => {
            if (el.id === element.id) {
              const newData = { ...el.data }
              if (el.type === "image" || el.type === "rectangle" || el.type === "circle") {
                const { x, y, width, height } = el.data
                if (selection.resizeHandle === "nw") {
                  newData.x = x + dx
                  newData.y = y + dy
                  newData.width = width - dx
                  newData.height = height - dy
                } else if (selection.resizeHandle === "ne") {
                  newData.y = y + dy
                  newData.width = width + dx
                  newData.height = height - dy
                } else if (selection.resizeHandle === "se") {
                  newData.width = width + dx
                  newData.height = height + dy
                } else if (selection.resizeHandle === "sw") {
                  newData.x = x + dx
                  newData.width = width - dx
                  newData.height = height + dy
                }
                // Ensure minimum size
                if (newData.width < 20) newData.width = 20
                if (newData.height < 20) newData.height = 20
              } else if (el.type === "text") {
                const { fontSize } = el.data
                const newFontSize = Math.max(12, Math.min(100, fontSize + dx * 0.5))
                newData.fontSize = newFontSize
              } else if (el.type === "line" || el.type === "arrow") {
                if (selection.resizeHandle === "start") {
                  newData.x1 = pos.x
                  newData.y1 = pos.y
                } else if (selection.resizeHandle === "end") {
                  newData.x2 = pos.x
                  newData.y2 = pos.y
                }
              }
              return { ...el, data: newData }
            }
            return el
          })
        })
        setSelection((prev) => ({ ...prev, dragStart: pos }))
      } else if (selection.isDragging) {
        const dx = pos.x - selection.dragStart.x
        const dy = pos.y - selection.dragStart.y

        setElements((prev) => {
          return prev.map((el) => {
            if (el.id === element.id) {
              if (el.type === "image" || el.type === "text") {
                return { ...el, data: { ...el.data, x: el.data.x + dx, y: el.data.y + dy } }
              } else if (el.type === "rectangle" || el.type === "circle") {
                return { ...el, data: { ...el.data, x: el.data.x + dx, y: el.data.y + dy } }
              } else if (el.type === "line" || el.type === "arrow") {
                return { ...el, data: { ...el.data, x1: el.data.x1 + dx, y1: el.data.y1 + dy, x2: el.data.x2 + dx, y2: el.data.y2 + dy } }
              }
            }
            return el
          })
        })
        setSelection((prev) => ({ ...prev, dragStart: pos }))
      }
    } else if (tool === "draw" && isDrawing) {
      const lastElement = elements[elements.length - 1]
      if (lastElement && lastElement.type === "draw" && lastElement.userId === currentUser.id) {
        setElements((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.type === "draw") {
            last.data.points.push(pos)
          }
          return updated
        })

        // Batch broadcast updates
        if (broadcastChannelRef.current) {
          broadcastQueueRef.current.push({
            type: "broadcast",
            event: "drawing-point",
            payload: {
              elementId: lastElement.id,
              point: pos,
            },
          })

          if (broadcastTimeoutRef.current) {
            clearTimeout(broadcastTimeoutRef.current)
          }

          broadcastTimeoutRef.current = setTimeout(() => {
            if (broadcastChannelRef.current && broadcastQueueRef.current.length > 0) {
              // Send batched points
              const points = broadcastQueueRef.current
                .filter(p => p.event === "drawing-point" && p.payload.elementId === lastElement.id)
                .map(p => p.payload.point)
              
              if (points.length > 0) {
                broadcastChannelRef.current.send({
                  type: "broadcast",
                  event: "drawing-points-batch",
                  payload: {
                    elementId: lastElement.id,
                    points,
                  },
                })
              }
              
              // Send other events
              broadcastQueueRef.current
                .filter(p => p.event !== "drawing-point")
                .forEach(event => {
                  broadcastChannelRef.current.send(event)
                })
              
              broadcastQueueRef.current = []
            }
          }, 100) // Batch every 100ms (increased from 50ms for better performance)
        }
      }
    } else if ((tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") && shapeStart) {
      // Update shape preview
      const lastElement = elements[elements.length - 1]
      if (lastElement && lastElement.type === tool && lastElement.userId === currentUser.id) {
        setElements((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.type === tool) {
            if (tool === "rectangle" || tool === "circle") {
              last.data.width = pos.x - shapeStart.x
              last.data.height = pos.y - shapeStart.y
            } else if (tool === "line" || tool === "arrow") {
              last.data.x2 = pos.x
              last.data.y2 = pos.y
            }
          }
          return updated
        })
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "element-update",
            payload: { element: lastElement },
          })
        }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getMousePos(e)
    handlePointerMove(pos)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getTouchPos(e)
    handlePointerMove(pos)
  }

  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false)

      if (broadcastChannelRef.current) {
        const lastElement = elements[elements.length - 1]
        if (lastElement && lastElement.type === "draw") {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "drawing-complete",
            payload: { element: lastElement },
          })
        }
      }

      saveWhiteboard()
    }

    if (selection.isDragging || selection.isResizing) {
      const element = elements.find((e) => e.id === selection.elementId)
      if (element && broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "element-update",
          payload: { element },
        })
      }
      setSelection((prev) => ({
        ...prev,
        isDragging: false,
        isResizing: false,
        dragStart: null,
      }))
      saveWhiteboard()
    }

    if (shapeStart) {
      const lastElement = elements[elements.length - 1]
      if (lastElement && (lastElement.type === "rectangle" || lastElement.type === "circle" || lastElement.type === "line" || lastElement.type === "arrow")) {
        // Auto-select shape after creation
        setSelection({
          elementId: lastElement.id,
          isDragging: false,
          isResizing: false,
          resizeHandle: null,
          dragStart: null
        })
        // Switch to select tool after creating shape
        setTool("select")

        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "element-add",
            payload: { element: lastElement },
          })
        }
      }
      setShapeStart(null)
      saveWhiteboard()
    }
  }

  const handleMouseUp = () => {
    handlePointerUp()
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()
    handlePointerUp()
  }

  // Save whiteboard to database - debounced (increased to 2 seconds for better performance)
  const saveWhiteboard = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (navigator.onLine) {
          // Online - save directly
          await updateWhiteboard(whiteboardId, JSON.stringify(elements))
        } else {
          // Offline - queue for sync
          const syncManager = SyncManager.getInstance()
          syncManager.addPendingAction('whiteboard-update', {
            whiteboardId,
            data: JSON.stringify(elements),
          })
          console.log('Offline - changes queued for sync')
        }
      } catch (error) {
        console.error("Failed to save whiteboard:", error)
        // If save fails, queue for sync
        if (navigator.onLine) {
          const syncManager = SyncManager.getInstance()
          syncManager.addPendingAction('whiteboard-update', {
            whiteboardId,
            data: JSON.stringify(elements),
          })
        }
      }
    }, 2000) // Debounce saves to 2 seconds to reduce database writes
  }, [whiteboardId, elements])
  
  // Save when elements change - but only after user stops interacting
  useEffect(() => {
    if (elements.length > 0 && !isDrawing && !selection.isDragging && !selection.isResizing && !shapeStart) {
      saveWhiteboard()
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [elements, isDrawing, selection.isDragging, selection.isResizing, shapeStart, saveWhiteboard])

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const uploadResults = await startUpload([file])
      if (uploadResults && uploadResults[0]) {
        const canvas = canvasRef.current
        if (!canvas) return

        const img = new Image()
        img.onload = () => {
          const maxWidth = Math.min(400, canvas.width * 0.6)
          const maxHeight = Math.min(400, canvas.height * 0.6)
          let width = img.width
          let height = img.height

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = width * ratio
            height = height * ratio
          }

          const x = (canvas.width - width) / 2
          const y = (canvas.height - height) / 2

          // Get the uploaded URL - try multiple possible properties
          const imageUrl = uploadResults[0].url || uploadResults[0].ufsUrl || uploadResults[0].serverUrl || ""

          if (!imageUrl) {
            console.error("No image URL returned from upload")
            return
          }

          const newElement: WhiteboardElement = {
            id: crypto.randomUUID(),
            type: "image",
            data: {
              url: imageUrl,
              x,
              y,
              width,
              height,
            },
            userId: currentUser.id,
            createdAt: Date.now(),
          }

          setElements((prev) => [...prev, newElement])
          setSelection({ elementId: newElement.id, isDragging: false, isResizing: false, resizeHandle: null, dragStart: null })
          // Auto-select image after upload so user can move/resize it
          setTool("select")

          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.send({
              type: "broadcast",
              event: "element-add",
              payload: { element: newElement },
            })
          }

          // Preload image for cache
          const preloadImg = new Image()
          preloadImg.crossOrigin = "anonymous"
          preloadImg.onload = () => {
            imageCacheRef.current.set(imageUrl, preloadImg)
          }
          preloadImg.src = imageUrl

          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
          }
          saveTimeoutRef.current = setTimeout(() => {
            saveWhiteboard()
          }, 500)
        }
        img.onerror = () => {
          console.error("Failed to load image")
        }
        img.src = URL.createObjectURL(file)
      }
    } catch (err) {
      console.error("Failed to upload image", err)
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle text input
  const handleTextSubmit = () => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null)
      return
    }

    const newElement: WhiteboardElement = {
      id: crypto.randomUUID(),
      type: "text",
      data: {
        text: textValue,
        x: textInput.x,
        y: textInput.y,
        color,
        fontSize: textFontSize,
      },
      userId: currentUser.id,
      createdAt: Date.now(),
    }

    setElements((prev) => [...prev, newElement])
    setSelection({ elementId: newElement.id, isDragging: false, isResizing: false, resizeHandle: null, dragStart: null })
    setTextInput(null)
    setTextValue("")
    setTool("select")

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: "broadcast",
        event: "element-add",
        payload: { element: newElement },
      })
    }
  }

  // Handle shape creation
  useEffect(() => {
    if (shapeStart && (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow")) {
      const newElement: WhiteboardElement = {
        id: crypto.randomUUID(),
        type: tool,
        data: tool === "line" || tool === "arrow"
          ? { x1: shapeStart.x, y1: shapeStart.y, x2: shapeStart.x, y2: shapeStart.y, color, lineWidth }
          : { x: shapeStart.x, y: shapeStart.y, width: 0, height: 0, color, lineWidth },
        userId: currentUser.id,
        createdAt: Date.now(),
      }
      setElements((prev) => [...prev, newElement])
    }
  }, [shapeStart, tool, color, lineWidth, currentUser.id])

  // Clear whiteboard
  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the whiteboard? This action cannot be undone.")) {
      setElements([])
      setSelection({ elementId: null, isDragging: false, isResizing: false, resizeHandle: null, dragStart: null })

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "clear",
          payload: {},
        })
      }

      // Save immediately
      updateWhiteboard(whiteboardId, JSON.stringify([]))
    }
  }

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Real-time subscriptions - optimized to prevent infinite loops
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`whiteboard-broadcast:${whiteboardId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on("broadcast", { event: "drawing-start" }, (payload) => {
        const { element } = payload.payload as any
        if (element && element.userId !== currentUser.id) {
          setElements((prev) => {
            // Check if element already exists to prevent duplicates
            if (prev.find(e => e.id === element.id)) return prev
            return [...prev, element]
          })
        }
      })
      .on("broadcast", { event: "drawing-point" }, (payload) => {
        const { elementId, point } = payload.payload as any
        if (!elementId || !point) return
        setElements((prev) => {
          const updated = [...prev]
          const element = updated.find((e) => e.id === elementId)
          if (element && element.type === "draw" && element.userId !== currentUser.id) {
            // Only update if point doesn't already exist (prevent duplicates)
            const lastPoint = element.data.points[element.data.points.length - 1]
            if (!lastPoint || lastPoint.x !== point.x || lastPoint.y !== point.y) {
              element.data.points.push(point)
            }
          }
          return updated
        })
      })
      .on("broadcast", { event: "drawing-points-batch" }, (payload) => {
        const { elementId, points } = payload.payload as any
        if (!elementId || !points || !Array.isArray(points)) return
        setElements((prev) => {
          const updated = [...prev]
          const element = updated.find((e) => e.id === elementId)
          if (element && element.type === "draw" && element.userId !== currentUser.id) {
            element.data.points.push(...points)
          }
          return updated
        })
      })
      .on("broadcast", { event: "drawing-complete" }, (payload) => {
        const { element } = payload.payload as any
        if (element && element.userId !== currentUser.id) {
          setElements((prev) => {
            const updated = [...prev]
            const existing = updated.find((e) => e.id === element.id)
            if (existing && existing.type === "draw") {
              existing.data = element.data
            }
            return updated
          })
        }
      })
      .on("broadcast", { event: "element-add" }, (payload) => {
        const { element } = payload.payload as any
        if (element && element.userId !== currentUser.id) {
          setElements((prev) => {
            // Check if element already exists to prevent duplicates
            if (prev.find(e => e.id === element.id)) return prev
            return [...prev, element]
          })
        }
      })
      .on("broadcast", { event: "clear" }, () => {
        setElements([])
        setSelection({ elementId: null, isDragging: false, isResizing: false, resizeHandle: null, dragStart: null })
      })
      .on("broadcast", { event: "element-update" }, (payload) => {
        const { element } = payload.payload as any
        if (element && element.userId !== currentUser.id) {
          setElements((prev) => {
            const existing = prev.find((el) => el.id === element.id)
            if (!existing) return prev
            // Only update if actually changed
            if (JSON.stringify(existing) === JSON.stringify(element)) return prev
            return prev.map((el) => el.id === element.id ? element : el)
          })
        }
      })
      .on("broadcast", { event: "element-remove" }, (payload) => {
        const { elementId } = payload.payload as any
        if (!elementId) return
        setElements((prev) => prev.filter((el) => el.id !== elementId))
      })
      .on("broadcast", { event: "cursor-move" }, (payload) => {
        const { userId, x, y, user } = payload.payload as any
        if (userId && userId !== currentUser.id && x !== undefined && y !== undefined) {
          setCursors((prev) => {
            const updated = new Map(prev)
            updated.set(userId, { userId, x, y, user })
            return updated
          })

          // Clear cursor after timeout
          setTimeout(() => {
            setCursors((prev) => {
              const updated = new Map(prev)
              updated.delete(userId)
              return updated
            })
          }, 2000) // Increased from 1000ms to 2000ms
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          broadcastChannelRef.current = channel
        }
      })

    const whiteboardChannel = supabase
      .channel(`whiteboard:${whiteboardId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whiteboards",
          filter: `id=eq.${whiteboardId}`,
        },
        (payload) => {
          const newData = payload.new as any
          if (newData && newData.data) {
            try {
              const newElements = JSON.parse(newData.data)
              if (!Array.isArray(newElements)) return
              
              setElements((prev) => {
                // Only update if data actually changed
                const prevStr = JSON.stringify(prev)
                const newStr = JSON.stringify(newElements)
                if (prevStr === newStr) return prev
                
                const merged = [...newElements]
                prev.forEach((localEl) => {
                  const exists = merged.find((e: WhiteboardElement) => e.id === localEl.id)
                  if (!exists || localEl.createdAt > exists.createdAt) {
                    const index = merged.findIndex((e: WhiteboardElement) => e.id === localEl.id)
                    if (index >= 0) {
                      merged[index] = localEl
                    } else {
                      merged.push(localEl)
                    }
                  }
                })
                return merged
              })
            } catch (err) {
              console.error("Failed to parse whiteboard data", err)
            }
          }
        }
      )
      .subscribe()

    return () => {
      if (supabase) {
        supabase.removeChannel(channel)
        supabase.removeChannel(whiteboardChannel)
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      broadcastChannelRef.current = null
    }
  }, [whiteboardId, currentUser.id, members])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const toolbarButtons = (
    <>
      <Button
        variant={tool === "select" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("select")}
        style={tool === "select" ? { backgroundColor: classColor } : {}}
        title="Select"
        className="flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "draw" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("draw")}
        style={tool === "draw" ? { backgroundColor: classColor } : {}}
        title="Draw"
        className="flex-shrink-0"
      >
        <PenTool className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "eraser" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("eraser")}
        style={tool === "eraser" ? { backgroundColor: classColor } : {}}
        title="Eraser"
        className="flex-shrink-0"
      >
        <Eraser className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "rectangle" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("rectangle")}
        style={tool === "rectangle" ? { backgroundColor: classColor } : {}}
        title="Rectangle"
        className="flex-shrink-0"
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "circle" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("circle")}
        style={tool === "circle" ? { backgroundColor: classColor } : {}}
        title="Circle"
        className="flex-shrink-0"
      >
        <Circle className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "line" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("line")}
        style={tool === "line" ? { backgroundColor: classColor } : {}}
        title="Line"
        className="flex-shrink-0"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "arrow" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("arrow")}
        style={tool === "arrow" ? { backgroundColor: classColor } : {}}
        title="Arrow"
        className="flex-shrink-0"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "image" ? "default" : "outline"}
        size="sm"
        onClick={() => {
          setTool("image")
          fileInputRef.current?.click()
        }}
        style={tool === "image" ? { backgroundColor: classColor } : {}}
        title="Image"
        className="flex-shrink-0"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "text" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("text")}
        style={tool === "text" ? { backgroundColor: classColor } : {}}
        title="Text"
        className="flex-shrink-0"
      >
        <Type className="h-4 w-4" />
      </Button>
      {(tool === "draw" || tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") && (
        <>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-16 rounded border flex-shrink-0"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-20 sm:w-24 flex-shrink-0"
          />
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{lineWidth}px</span>
        </>
      )}
    </>
  )

  return (
    <div className="flex flex-col bg-background fixed inset-0 z-50">
      {/* Toolbar - Mobile responsive */}
      <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-auto z-10 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-1.5 sm:p-2 border overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-max">
            {toolbarButtons}
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-1.5 sm:p-2 border flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={handleClear} className="w-full sm:w-auto">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onDoubleClick={(e) => {
            if (tool === "select") {
              const pos = getMousePos(e)
              const element = getElementAt(pos.x, pos.y)
              if (element && element.type === "text") {
                setTextInput({ x: element.data.x, y: element.data.y })
                setTextValue(element.data.text)
                setTextFontSize(element.data.fontSize)
                setColor(element.data.color)
                setElements((prev) => prev.filter((el) => el.id !== element.id))
                if (broadcastChannelRef.current) {
                  broadcastChannelRef.current.send({
                    type: "broadcast",
                    event: "element-remove",
                    payload: { elementId: element.id },
                  })
                }
              }
            }
          }}
          className={cn(
            "absolute inset-0",
            tool === "draw" || tool === "eraser" ? "cursor-crosshair" : 
            tool === "select" ? "cursor-default" : "cursor-crosshair"
          )}
          style={{ touchAction: "none", pointerEvents: "auto" }}
        />

        {/* Cursors */}
        {Array.from(cursors.values()).map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none z-10"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: "translate(-8px, -8px)",
            }}
          >
            <Avatar className="h-4 w-4 border-2 border-white shadow-lg">
              <AvatarImage src={cursor.user.image || undefined} alt={cursor.user.name} />
              <AvatarFallback className="text-[8px] bg-blue-600 text-white">
                {getInitials(cursor.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {cursor.user.name}
            </div>
          </div>
        ))}

        {/* Text Input */}
        {textInput && (
          <div
            className="absolute z-20 flex flex-col gap-2"
            style={{ left: textInput.x, top: textInput.y }}
          >
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTextSubmit()
                } else if (e.key === "Escape") {
                  setTextInput(null)
                  setTextValue("")
                }
              }}
              autoFocus
              className="px-2 py-1 border rounded bg-white"
              style={{ color, fontSize: textFontSize }}
            />
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded p-2 border">
              <label className="text-xs text-muted-foreground">Font Size:</label>
              <input
                type="range"
                min="12"
                max="100"
                value={textFontSize}
                onChange={(e) => setTextFontSize(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">{textFontSize}px</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
}

