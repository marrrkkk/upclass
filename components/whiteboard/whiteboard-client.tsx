"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
        redrawCanvas()
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  // Redraw all elements on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    elements.forEach((element) => {
      if (element.type === "draw") {
        drawPath(ctx, element.data)
      } else if (element.type === "image") {
        drawImage(ctx, element.data)
      } else if (element.type === "text") {
        drawText(ctx, element.data)
      } else if (element.type === "rectangle") {
        drawRectangle(ctx, element.data)
      } else if (element.type === "circle") {
        drawCircle(ctx, element.data)
      } else if (element.type === "line") {
        drawLine(ctx, element.data)
      } else if (element.type === "arrow") {
        drawArrow(ctx, element.data)
      }
    })

    // Draw selection handles
    if (selection.elementId) {
      const element = elements.find((e) => e.id === selection.elementId)
      if (element && (element.type === "image" || element.type === "text")) {
        drawSelectionHandles(ctx, element)
      }
    }
  }, [elements, selection])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // Drawing functions
  const drawPath = (ctx: CanvasRenderingContext2D, path: { points: Array<{ x: number; y: number }>; color: string; width: number }) => {
    if (path.points.length < 2) return

    ctx.strokeStyle = path.color
    ctx.lineWidth = path.width
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    ctx.beginPath()
    ctx.moveTo(path.points[0].x, path.points[0].y)

    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y)
    }

    ctx.stroke()
  }

  const drawImage = (ctx: CanvasRenderingContext2D, data: { url: string; x: number; y: number; width: number; height: number }) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      ctx.drawImage(img, data.x, data.y, data.width, data.height)
    }
    img.src = data.url
  }

  const drawText = (ctx: CanvasRenderingContext2D, data: { text: string; x: number; y: number; color: string; fontSize: number }) => {
    ctx.fillStyle = data.color
    ctx.font = `${data.fontSize}px Arial`
    ctx.fillText(data.text, data.x, data.y)
  }

  const drawRectangle = (ctx: CanvasRenderingContext2D, data: { x: number; y: number; width: number; height: number; color: string; lineWidth: number }) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.strokeRect(data.x, data.y, data.width, data.height)
  }

  const drawCircle = (ctx: CanvasRenderingContext2D, data: { x: number; y: number; width: number; height: number; color: string; lineWidth: number }) => {
    const centerX = data.x + data.width / 2
    const centerY = data.y + data.height / 2
    const radius = Math.min(Math.abs(data.width), Math.abs(data.height)) / 2

    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()
  }

  const drawLine = (ctx: CanvasRenderingContext2D, data: { x1: number; y1: number; x2: number; y2: number; color: string; lineWidth: number }) => {
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.beginPath()
    ctx.moveTo(data.x1, data.y1)
    ctx.lineTo(data.x2, data.y2)
    ctx.stroke()
  }

  const drawArrow = (ctx: CanvasRenderingContext2D, data: { x1: number; y1: number; x2: number; y2: number; color: string; lineWidth: number }) => {
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
  }

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, element: WhiteboardElement) => {
    if (element.type === "image") {
      const { x, y, width, height } = element.data
      const handleSize = 8

      ctx.strokeStyle = classColor
      ctx.fillStyle = "white"
      ctx.lineWidth = 2

      // Corner handles
      const handles = [
        { x, y }, // top-left
        { x: x + width, y }, // top-right
        { x: x + width, y: y + height }, // bottom-right
        { x, y: y + height }, // bottom-left
      ]

      handles.forEach((handle) => {
        ctx.beginPath()
        ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        ctx.fill()
        ctx.stroke()
      })
    } else if (element.type === "text") {
      const { x, y, fontSize, text } = element.data
      const metrics = ctx.measureText(text)
      const width = metrics.width
      const height = fontSize

      ctx.strokeStyle = classColor
      ctx.fillStyle = "white"
      ctx.lineWidth = 2

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
    }
  }

  // Mouse events
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)

    if (tool === "select") {
      const element = getElementAt(pos.x, pos.y)
      if (element && (element.type === "image" || element.type === "text")) {
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
      setElements((prev) => {
        return prev.filter((el) => {
          if (el.type === "draw") {
            // Check if any point is near the eraser position
            const threshold = 20
            return !el.data.points.some((p: { x: number; y: number }) => {
              const dist = Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2))
              return dist < threshold
            })
          } else if (el.type === "image" || el.type === "text") {
            const { x: ex, y: ey, width, height } = el.data
            return !(pos.x >= ex && pos.x <= ex + width && pos.y >= ey && pos.y <= ey + height)
          }
          return true
        })
      })
    } else if (tool === "text") {
      setTextInput(pos)
      setTextValue("")
    } else if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
      setShapeStart(pos)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    
    const now = Date.now()
    if (now - lastUpdateRef.current > 50) {
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

      if (selection.isResizing && element.type === "image") {
        const { x, y, width, height } = element.data
        const dx = pos.x - selection.dragStart.x
        const dy = pos.y - selection.dragStart.y

        setElements((prev) => {
          return prev.map((el) => {
            if (el.id === element.id) {
              const newData = { ...el.data }
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
              return { ...el, data: newData }
            }
            return el
          })
        })
        setSelection((prev) => ({ ...prev, dragStart: pos }))
      } else if (selection.isResizing && element.type === "text") {
        const { fontSize } = element.data
        const dx = pos.x - selection.dragStart.x
        const newFontSize = Math.max(12, Math.min(100, fontSize + dx * 0.5))

        setElements((prev) => {
          return prev.map((el) => {
            if (el.id === element.id) {
              return { ...el, data: { ...el.data, fontSize: newFontSize } }
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
              if (el.type === "image") {
                return { ...el, data: { ...el.data, x: el.data.x + dx, y: el.data.y + dy } } }
              else if (el.type === "text") {
                return { ...el, data: { ...el.data, x: el.data.x + dx, y: el.data.y + dy } } }
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

        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "drawing-point",
            payload: {
              elementId: lastElement.id,
              point: pos,
            },
          })
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
      }
    }
  }

  const handleMouseUp = () => {
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

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveWhiteboard()
      }, 500)
    }

    if (selection.isDragging || selection.isResizing) {
      setSelection((prev) => ({
        ...prev,
        isDragging: false,
        isResizing: false,
        dragStart: null,
      }))
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveWhiteboard()
      }, 500)
    }

    if (shapeStart) {
      setShapeStart(null)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveWhiteboard()
      }, 500)
    }
  }

  // Save whiteboard to database
  const saveWhiteboard = async () => {
    await updateWhiteboard(whiteboardId, JSON.stringify(elements))
  }

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
          const maxWidth = 300
          const maxHeight = 300
          let width = img.width
          let height = img.height

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = width * ratio
            height = height * ratio
          }

          const x = (canvas.width - width) / 2
          const y = (canvas.height - height) / 2

          const newElement: WhiteboardElement = {
            id: crypto.randomUUID(),
            type: "image",
            data: {
              url: uploadResults[0].ufsUrl || uploadResults[0].url || "",
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
          setTool("select")

          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.send({
              type: "broadcast",
              event: "element-add",
              payload: { element: newElement },
            })
          }

          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
          }
          saveTimeoutRef.current = setTimeout(() => {
            saveWhiteboard()
          }, 500)
        }
        img.src = URL.createObjectURL(file)
      }
    } catch (err) {
      console.error("Failed to upload image", err)
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
        fontSize: 20,
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

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveWhiteboard()
    }, 500)
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

      saveWhiteboard()
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

  // Real-time subscriptions
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
        if (element.userId !== currentUser.id) {
          setElements((prev) => [...prev, element])
        }
      })
      .on("broadcast", { event: "drawing-point" }, (payload) => {
        const { elementId, point } = payload.payload as any
        setElements((prev) => {
          const updated = [...prev]
          const element = updated.find((e) => e.id === elementId)
          if (element && element.type === "draw" && element.userId !== currentUser.id) {
            element.data.points.push(point)
          }
          return updated
        })
      })
      .on("broadcast", { event: "drawing-complete" }, (payload) => {
        const { element } = payload.payload as any
        if (element.userId !== currentUser.id) {
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
        if (element.userId !== currentUser.id) {
          setElements((prev) => [...prev, element])
        }
      })
      .on("broadcast", { event: "clear" }, () => {
        setElements([])
      })
      .on("broadcast", { event: "cursor-move" }, (payload) => {
        const { userId, x, y, user } = payload.payload as any
        if (userId !== currentUser.id) {
          setCursors((prev) => {
            const updated = new Map(prev)
            updated.set(userId, { userId, x, y, user })
            return updated
          })

          setTimeout(() => {
            setCursors((prev) => {
              const updated = new Map(prev)
              updated.delete(userId)
              return updated
            })
          }, 1000)
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
          if (newData.data) {
            try {
              const newElements = JSON.parse(newData.data)
              setElements((prev) => {
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
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={tool === "select" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("select")}
        style={tool === "select" ? { backgroundColor: classColor } : {}}
        title="Select"
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "draw" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("draw")}
        style={tool === "draw" ? { backgroundColor: classColor } : {}}
        title="Draw"
      >
        <PenTool className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "eraser" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("eraser")}
        style={tool === "eraser" ? { backgroundColor: classColor } : {}}
        title="Eraser"
      >
        <Eraser className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "rectangle" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("rectangle")}
        style={tool === "rectangle" ? { backgroundColor: classColor } : {}}
        title="Rectangle"
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "circle" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("circle")}
        style={tool === "circle" ? { backgroundColor: classColor } : {}}
        title="Circle"
      >
        <Circle className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "line" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("line")}
        style={tool === "line" ? { backgroundColor: classColor } : {}}
        title="Line"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "arrow" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("arrow")}
        style={tool === "arrow" ? { backgroundColor: classColor } : {}}
        title="Arrow"
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
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      <Button
        variant={tool === "text" ? "default" : "outline"}
        size="sm"
        onClick={() => setTool("text")}
        style={tool === "text" ? { backgroundColor: classColor } : {}}
        title="Text"
      >
        <Type className="h-4 w-4" />
      </Button>
      {(tool === "draw" || tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") && (
        <>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-16 rounded border"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">{lineWidth}px</span>
        </>
      )}
    </div>
  )

  return (
    <div className={cn("flex flex-col bg-background", isFullscreen && "fixed inset-0 z-50")}>
      {!isFullscreen && (
        <>
          {/* Header */}
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{className} - Whiteboard</h1>
              <p className="text-sm text-muted-foreground">Collaborative whiteboard</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={toggleFullscreen}>
                <Maximize className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
              <Button variant="outline" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="border-b px-6 py-3" style={{ backgroundColor: `${classColor}10` }}>
            {toolbarButtons}
          </div>
        </>
      )}

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
        {isFullscreen && (
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 border">
              {toolbarButtons}
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 border flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <Minimize className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={cn(
            "absolute inset-0",
            tool === "draw" || tool === "eraser" ? "cursor-crosshair" : 
            tool === "select" ? "cursor-default" : "cursor-crosshair"
          )}
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
            className="absolute z-20"
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
              style={{ color, fontSize: 20 }}
            />
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

