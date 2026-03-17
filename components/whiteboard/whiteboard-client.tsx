"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

import { WhiteboardOverlays } from "@/components/whiteboard/whiteboard-overlays"
import { WhiteboardToolbar } from "@/components/whiteboard/whiteboard-toolbar"
import {
  createDrawElement,
  createImageElement,
  createShapeElement,
  createTextElement,
  getElementAt,
  getResizeHandle,
  isSelectableElement,
  isShapeTool,
  parseWhiteboardData,
} from "@/components/whiteboard/whiteboard-utils"
import { useWhiteboardCanvas } from "@/hooks/whiteboard/use-whiteboard-canvas"
import { useWhiteboardRealtime } from "@/hooks/whiteboard/use-whiteboard-realtime"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"
import type {
  BoxElementData,
  DrawElement,
  ImageElementData,
  LineElementData,
  SelectionState,
  TextElementData,
  WhiteboardClientProps,
  WhiteboardElement,
  WhiteboardPoint,
  WhiteboardTool,
} from "@/types/whiteboard"

const INITIAL_SELECTION: SelectionState = {
  elementId: null,
  isDragging: false,
  isResizing: false,
  resizeHandle: null,
  dragStart: null,
}

export function WhiteboardClient({
  whiteboardId,
  classId,
  className,
  classColor,
  initialData,
  initialUpdatedAt,
  currentUser,
}: WhiteboardClientProps) {
  const [elements, setElements] = useState<WhiteboardElement[]>(() => parseWhiteboardData(initialData))
  const [tool, setTool] = useState<WhiteboardTool>("draw")
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState("#000000")
  const [lineWidth, setLineWidth] = useState(3)
  const [cursors, setCursors] = useState<Map<string, { userId: string; x: number; y: number; user: typeof currentUser }>>(new Map())
  const [textInput, setTextInput] = useState<WhiteboardPoint | null>(null)
  const [textValue, setTextValue] = useState("")
  const [textFontSize, setTextFontSize] = useState(20)
  const [selection, setSelection] = useState<SelectionState>(INITIAL_SELECTION)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shapeStart, setShapeStart] = useState<WhiteboardPoint | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const elementsRef = useRef<WhiteboardElement[]>(parseWhiteboardData(initialData))
  const selectionRef = useRef<SelectionState>(INITIAL_SELECTION)
  const pendingDrawPointsRef = useRef<WhiteboardPoint[]>([])
  const drawFlushFrameRef = useRef<number | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const lastSavedUpdatedAtRef = useRef<string | null>(initialUpdatedAt ?? null)
  const { startUpload } = useUploadThing("imageUploader")

  const { canvasRef, containerRef, imageCacheRef, getMousePos, getTouchPos } = useWhiteboardCanvas({
    classColor,
    elements,
    selectedElementId: selection.elementId,
  })

  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  const flushPendingDrawPoints = useCallback(() => {
    if (drawFlushFrameRef.current) {
      cancelAnimationFrame(drawFlushFrameRef.current)
      drawFlushFrameRef.current = null
    }

    const pendingPoints = pendingDrawPointsRef.current
    if (pendingPoints.length === 0) {
      const lastElement = elementsRef.current[elementsRef.current.length - 1]
      return lastElement?.type === "draw" ? lastElement : null
    }

    let nextDrawElement: DrawElement | null = null
    setElements((previous) => {
      const updated = [...previous]
      const current = updated[updated.length - 1]
      if (!current || current.type !== "draw") {
        pendingDrawPointsRef.current = []
        return previous
      }

      nextDrawElement = {
        ...current,
        data: {
          ...current.data,
          points: [...current.data.points, ...pendingPoints],
        },
      }
      updated[updated.length - 1] = nextDrawElement
      elementsRef.current = updated
      pendingDrawPointsRef.current = []
      return updated
    })

    return nextDrawElement
  }, [])

  const scheduleDrawFlush = useCallback(() => {
    if (drawFlushFrameRef.current) return

    drawFlushFrameRef.current = window.requestAnimationFrame(() => {
      drawFlushFrameRef.current = null
      flushPendingDrawPoints()
    })
  }, [flushPendingDrawPoints])

  const syncFromServer = useCallback(() => {
    return fetch(`/api/whiteboards/${whiteboardId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load whiteboard document")
        }
        const data = (await response.json()) as {
          data: string
          updatedAt: string
        }
        const nextElements = parseWhiteboardData(data.data)
        elementsRef.current = nextElements
        lastSavedUpdatedAtRef.current = data.updatedAt
        setElements(nextElements)
      })
  }, [whiteboardId])

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      saveTimeoutRef.current = null
      try {
        const response = await fetch(`/api/whiteboards/${whiteboardId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: JSON.stringify(elementsRef.current),
            clientUpdatedAt: lastSavedUpdatedAtRef.current,
          }),
        })

        if (response.status === 409) {
          const conflict = (await response.json()) as {
            data: string
            updatedAt: string
          }
          const nextElements = parseWhiteboardData(conflict.data)
          elementsRef.current = nextElements
          lastSavedUpdatedAtRef.current = conflict.updatedAt
          setElements(nextElements)
          return
        }

        if (!response.ok) {
          throw new Error("Failed to save whiteboard")
        }

        const result = (await response.json()) as {
          updatedAt: string
        }
        lastSavedUpdatedAtRef.current = result.updatedAt
      } catch (error) {
        console.error("Failed to persist whiteboard document", error)
      }
    }, 600)
  }, [whiteboardId])

  const { broadcastCursor, queueDrawingPoint, queueElementUpdate, sendBroadcast } = useWhiteboardRealtime({
    currentUser,
    onReconnect: () => {
      void syncFromServer().catch((error) => {
        console.error("Failed to sync whiteboard after reconnect", error)
      })
    },
    setCursors,
    setElements,
    setSelection,
    whiteboardId,
  })

  useEffect(() => {
    // Persist whenever the local elements change, with debounce
    scheduleSave()
  }, [elements, scheduleSave])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selection.elementId) ?? null,
    [elements, selection.elementId],
  )

  const handlePointerDown = useCallback(
    (position: WhiteboardPoint) => {
      const canvas = canvasRef.current

      if (tool === "select") {
        const element = getElementAt(elements, position.x, position.y, canvas)
        if (!element || !isSelectableElement(element)) {
          setSelection(INITIAL_SELECTION)
          return
        }

        const resizeHandle = getResizeHandle(position.x, position.y, element, canvas)
        setSelection({
          elementId: element.id,
          isDragging: !resizeHandle,
          isResizing: !!resizeHandle,
          resizeHandle,
          dragStart: position,
        })
        return
      }

      if (tool === "draw") {
        setIsDrawing(true)
        pendingDrawPointsRef.current = []
        const newElement = createDrawElement(position, color, lineWidth, currentUser.id)
        setElements((previous) => [...previous, newElement])
        sendBroadcast("drawing-start", { element: newElement })
        return
      }

      if (tool === "eraser") {
        const elementToErase = getElementAt(elements, position.x, position.y, canvas)
        if (!elementToErase) return

        const nextElements = elements.filter((element) => element.id !== elementToErase.id)
        setElements(nextElements)
        sendBroadcast("element-remove", { elementId: elementToErase.id })
        return
      }

      if (tool === "text") {
        setTextInput(position)
        setTextValue("")
        setTextFontSize(20)
        return
      }

      if (isShapeTool(tool)) {
        const newElement = createShapeElement(tool, position, color, lineWidth, currentUser.id)
        setElements((previous) => [...previous, newElement])
        setShapeStart(position)
        setSelection(INITIAL_SELECTION)
      }
    },
    [canvasRef, color, currentUser.id, elements, lineWidth, sendBroadcast, tool],
  )

  const handlePointerMove = useCallback(
    (position: WhiteboardPoint) => {
      broadcastCursor(position)

      if (tool === "select" && selection.elementId && selection.dragStart) {
        const element = selectedElement
        if (!element || !isSelectableElement(element)) return

        if (selection.isResizing) {
          const dx = position.x - selection.dragStart.x
          const dy = position.y - selection.dragStart.y

          setElements((previous) =>
            previous.map((entry) => {
              if (entry.id !== element.id || !isSelectableElement(entry)) return entry

              if (entry.type === "image") {
                const nextData: ImageElementData = { ...entry.data }
                if (selection.resizeHandle === "nw") {
                  nextData.x = entry.data.x + dx
                  nextData.y = entry.data.y + dy
                  nextData.width = entry.data.width - dx
                  nextData.height = entry.data.height - dy
                } else if (selection.resizeHandle === "ne") {
                  nextData.y = entry.data.y + dy
                  nextData.width = entry.data.width + dx
                  nextData.height = entry.data.height - dy
                } else if (selection.resizeHandle === "se") {
                  nextData.width = entry.data.width + dx
                  nextData.height = entry.data.height + dy
                } else if (selection.resizeHandle === "sw") {
                  nextData.x = entry.data.x + dx
                  nextData.width = entry.data.width - dx
                  nextData.height = entry.data.height + dy
                }
                nextData.width = Math.max(20, nextData.width)
                nextData.height = Math.max(20, nextData.height)
                return { ...entry, data: nextData }
              }

              if (entry.type === "rectangle" || entry.type === "circle") {
                const nextData: BoxElementData = { ...entry.data }
                if (selection.resizeHandle === "nw") {
                  nextData.x = entry.data.x + dx
                  nextData.y = entry.data.y + dy
                  nextData.width = entry.data.width - dx
                  nextData.height = entry.data.height - dy
                } else if (selection.resizeHandle === "ne") {
                  nextData.y = entry.data.y + dy
                  nextData.width = entry.data.width + dx
                  nextData.height = entry.data.height - dy
                } else if (selection.resizeHandle === "se") {
                  nextData.width = entry.data.width + dx
                  nextData.height = entry.data.height + dy
                } else if (selection.resizeHandle === "sw") {
                  nextData.x = entry.data.x + dx
                  nextData.width = entry.data.width - dx
                  nextData.height = entry.data.height + dy
                }
                nextData.width = Math.max(20, nextData.width)
                nextData.height = Math.max(20, nextData.height)
                return { ...entry, data: nextData }
              }

              if (entry.type === "text") {
                const nextData: TextElementData = {
                  ...entry.data,
                  fontSize: Math.max(12, Math.min(100, entry.data.fontSize + dx * 0.5)),
                }

                return {
                  ...entry,
                  data: nextData,
                }
              }

              const nextData: LineElementData = { ...entry.data }
              if (selection.resizeHandle === "start") {
                nextData.x1 = position.x
                nextData.y1 = position.y
              } else if (selection.resizeHandle === "end") {
                nextData.x2 = position.x
                nextData.y2 = position.y
              }
              return { ...entry, data: nextData }
            }),
          )
          setSelection((previous) => ({ ...previous, dragStart: position }))
          return
        }

        if (selection.isDragging) {
          const dx = position.x - selection.dragStart.x
          const dy = position.y - selection.dragStart.y

          setElements((previous) =>
            previous.map((entry) => {
              if (entry.id !== element.id || !isSelectableElement(entry)) return entry

              if (entry.type === "image") {
                const nextData: ImageElementData = {
                  ...entry.data,
                  x: entry.data.x + dx,
                  y: entry.data.y + dy,
                }
                return {
                  ...entry,
                  data: nextData,
                }
              }

              if (entry.type === "text") {
                const nextData: TextElementData = {
                  ...entry.data,
                  x: entry.data.x + dx,
                  y: entry.data.y + dy,
                }
                return {
                  ...entry,
                  data: nextData,
                }
              }

              if (entry.type === "rectangle" || entry.type === "circle") {
                const nextData: BoxElementData = {
                  ...entry.data,
                  x: entry.data.x + dx,
                  y: entry.data.y + dy,
                }
                return {
                  ...entry,
                  data: nextData,
                }
              }

              const nextData: LineElementData = {
                ...entry.data,
                x1: entry.data.x1 + dx,
                y1: entry.data.y1 + dy,
                x2: entry.data.x2 + dx,
                y2: entry.data.y2 + dy,
              }

              return {
                ...entry,
                data: nextData,
              }
            }),
          )
          setSelection((previous) => ({ ...previous, dragStart: position }))
          return
        }
      }

      if (tool === "draw" && isDrawing) {
        const lastElement = elementsRef.current[elementsRef.current.length - 1]
        if (!lastElement || lastElement.type !== "draw" || lastElement.userId !== currentUser.id) return

        pendingDrawPointsRef.current.push(position)
        scheduleDrawFlush()
        queueDrawingPoint(lastElement.id, position)
        return
      }

      if (shapeStart && isShapeTool(tool)) {
        const lastElement = elementsRef.current[elementsRef.current.length - 1]
        if (!lastElement || lastElement.type !== tool || lastElement.userId !== currentUser.id) return

        let nextElement: WhiteboardElement
        if (lastElement.type === "rectangle" || lastElement.type === "circle") {
          const nextData: BoxElementData = {
            ...lastElement.data,
            width: position.x - shapeStart.x,
            height: position.y - shapeStart.y,
          }

          nextElement = {
            ...lastElement,
            data: nextData,
          }
        } else if (lastElement.type === "line" || lastElement.type === "arrow") {
          const nextData: LineElementData = {
            ...lastElement.data,
            x2: position.x,
            y2: position.y,
          }

          nextElement = {
            ...lastElement,
            data: nextData,
          }
        } else {
          return
        }

        setElements((previous) => previous.map((entry) => (entry.id === nextElement.id ? nextElement : entry)))
        queueElementUpdate(nextElement)
      }
    },
    [
      broadcastCursor,
      currentUser.id,
      isDrawing,
      queueElementUpdate,
      queueDrawingPoint,
      scheduleDrawFlush,
      selectedElement,
      selection,
      shapeStart,
      tool,
    ],
  )

  const handlePointerUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      const lastElement = flushPendingDrawPoints() ?? elementsRef.current[elementsRef.current.length - 1]
      pendingDrawPointsRef.current = []
      if (lastElement?.type === "draw") {
        sendBroadcast("drawing-complete", { element: lastElement })
      }
      return
    }

    if (selection.isDragging || selection.isResizing) {
      if (selectedElement) {
        sendBroadcast("element-update", { element: selectedElement })
      }
      setSelection((previous) => ({
        ...previous,
        isDragging: false,
        isResizing: false,
        dragStart: null,
      }))
      return
    }

    if (shapeStart) {
      const lastElement = elementsRef.current[elementsRef.current.length - 1]
      if (lastElement && isSelectableElement(lastElement)) {
        setSelection({
          elementId: lastElement.id,
          isDragging: false,
          isResizing: false,
          resizeHandle: null,
          dragStart: null,
        })
        setTool("select")
        sendBroadcast("element-add", { element: lastElement })
      }
      setShapeStart(null)
    }
  }, [flushPendingDrawPoints, isDrawing, selectedElement, selection, sendBroadcast, shapeStart])

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const uploadResults = await startUpload([file])
        const imageUrl = uploadResults?.[0]?.url || uploadResults?.[0]?.ufsUrl || ""
        if (!imageUrl || !canvasRef.current) return

        const preview = new Image()
        preview.onload = () => {
          if (!canvasRef.current) return

          const maxWidth = Math.min(400, canvasRef.current.width * 0.6)
          const maxHeight = Math.min(400, canvasRef.current.height * 0.6)
          let width = preview.width
          let height = preview.height

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width *= ratio
            height *= ratio
          }

          const newElement = createImageElement(
            {
              url: imageUrl,
              x: (canvasRef.current.width - width) / 2,
              y: (canvasRef.current.height - height) / 2,
              width,
              height,
            },
            currentUser.id,
          )

          const nextElements = [...elements, newElement]
          setElements(nextElements)
          setSelection({
            elementId: newElement.id,
            isDragging: false,
            isResizing: false,
            resizeHandle: null,
            dragStart: null,
          })
          setTool("select")
          sendBroadcast("element-add", { element: newElement })

          const cachedImage = new Image()
          cachedImage.crossOrigin = "anonymous"
          cachedImage.onload = () => {
            imageCacheRef.current.set(imageUrl, cachedImage)
          }
          cachedImage.src = imageUrl
        }

        preview.src = URL.createObjectURL(file)
      } catch (error) {
        console.error("Failed to upload image", error)
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [canvasRef, currentUser.id, elements, imageCacheRef, sendBroadcast, startUpload],
  )

  const handleTextSubmit = useCallback(() => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null)
      return
    }

    const newElement = createTextElement(textValue, textInput, color, textFontSize, currentUser.id)
    const nextElements = [...elements, newElement]
    setElements(nextElements)
    setSelection({
      elementId: newElement.id,
      isDragging: false,
      isResizing: false,
      resizeHandle: null,
      dragStart: null,
    })
    setTextInput(null)
    setTextValue("")
    setTool("select")
    sendBroadcast("element-add", { element: newElement })
  }, [color, currentUser.id, elements, sendBroadcast, textFontSize, textInput, textValue])

  const handleClear = useCallback(() => {
    if (!window.confirm("Are you sure you want to clear the whiteboard? This action cannot be undone.")) {
      return
    }

    setElements([])
    setSelection(INITIAL_SELECTION)
    sendBroadcast("clear", {})
  }, [sendBroadcast])

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      void containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
      return
    }

    void document.exitFullscreen()
    setIsFullscreen(false)
  }, [containerRef, isFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handlePointerDown(getMousePos(event))
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handlePointerDown(getTouchPos(event))
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handlePointerMove(getMousePos(event))
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handlePointerMove(getTouchPos(event))
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handlePointerUp()
  }

  const handleTextEdit = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "select") return

    const position = getMousePos(event)
    const element = getElementAt(elements, position.x, position.y, canvasRef.current)
    if (!element || element.type !== "text") return

    setTextInput({ x: element.data.x, y: element.data.y })
    setTextValue(element.data.text)
    setTextFontSize(element.data.fontSize)
    setColor(element.data.color)
    setElements((previous) => previous.filter((entry) => entry.id !== element.id))
    setSelection(INITIAL_SELECTION)
    sendBroadcast("element-remove", { elementId: element.id })
  }

  useEffect(() => {
    return () => {
      if (drawFlushFrameRef.current) {
        cancelAnimationFrame(drawFlushFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href={`/classes/${classId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden="true">←</span>
            Back to Class
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{className} Whiteboard</h1>
            <p className="text-sm text-muted-foreground">Collaborate in the same tab without leaving the class flow.</p>
          </div>
        </div>
      </div>

      <WhiteboardToolbar
        classColor={classColor}
        className={className}
        color={color}
        fileInputRef={fileInputRef}
        isFullscreen={isFullscreen}
        lineWidth={lineWidth}
        onClear={handleClear}
        onColorChange={setColor}
        onLineWidthChange={setLineWidth}
        onToggleFullscreen={toggleFullscreen}
        onToolChange={setTool}
        tool={tool}
      />

      <div
        ref={containerRef}
        className="relative min-h-[65vh] h-[calc(100vh-18rem)] max-h-[78vh] min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm touch-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onDoubleClick={handleTextEdit}
          className={cn(
            "absolute inset-0",
            tool === "select" ? "cursor-default" : "cursor-crosshair",
          )}
          style={{ touchAction: "none", pointerEvents: "auto" }}
        />

        <WhiteboardOverlays
          color={color}
          cursors={cursors}
          onCancelText={() => {
            setTextInput(null)
            setTextValue("")
          }}
          onSubmitText={handleTextSubmit}
          onTextChange={setTextValue}
          onTextFontSizeChange={setTextFontSize}
          textFontSize={textFontSize}
          textInput={textInput}
          textValue={textValue}
        />
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
