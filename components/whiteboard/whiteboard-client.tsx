"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PenTool, Image as ImageIcon, Type, Trash2, Download, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateWhiteboard } from "@/app/actions/whiteboard"
import { useUploadThing } from "@/lib/uploadthing"

type WhiteboardElement = {
  id: string
  type: "draw" | "image" | "text"
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
  const [tool, setTool] = useState<"draw" | "image" | "text">("draw")
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState("#000000")
  const [lineWidth, setLineWidth] = useState(3)
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map())
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null)
  const [textValue, setTextValue] = useState("")
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

    // Set canvas size
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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all elements
    elements.forEach((element) => {
      if (element.type === "draw") {
        drawPath(ctx, element.data)
      } else if (element.type === "image") {
        drawImage(ctx, element.data)
      } else if (element.type === "text") {
        drawText(ctx, element.data)
      }
    })
  }, [elements])

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === "draw") {
      setIsDrawing(true)
      const pos = getMousePos(e)
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

      // Broadcast new drawing start in real-time
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "drawing-start",
          payload: {
            element: newElement,
          },
        })
      }
    } else if (tool === "text") {
      const pos = getMousePos(e)
      setTextInput(pos)
      setTextValue("")
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    
    // Update cursor position via broadcast (throttled for performance)
    const now = Date.now()
    if (now - lastUpdateRef.current > 50) {
      // Broadcast cursor position in real-time
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

    if (tool === "draw" && isDrawing) {
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

        // Broadcast drawing point in real-time
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
    }
  }

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false)
      
      // Broadcast drawing complete
      if (broadcastChannelRef.current) {
        const lastElement = elements[elements.length - 1]
        if (lastElement && lastElement.type === "draw") {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "drawing-complete",
            payload: {
              element: lastElement,
            },
          })
        }
      }

      // Save to database (debounced)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveWhiteboard()
      }, 500)
    }
  }

  // Save whiteboard to database (debounced)
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
          
          // Broadcast image in real-time
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.send({
              type: "broadcast",
              event: "element-add",
              payload: {
                element: newElement,
              },
            })
          }

          // Save to database
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
    setTextInput(null)
    setTextValue("")
    
    // Broadcast text in real-time
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: "broadcast",
        event: "element-add",
        payload: {
          element: newElement,
        },
      })
    }

    // Save to database
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveWhiteboard()
    }, 500)
  }

  // Clear whiteboard
  const handleClear = () => {
    if (confirm("Are you sure you want to clear the whiteboard?")) {
      setElements([])
      
      // Broadcast clear in real-time
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "clear",
          payload: {},
        })
      }

      // Save to database
      saveWhiteboard()
    }
  }

  // Real-time subscriptions
  useEffect(() => {
    if (!supabase) return

    // Create broadcast channel for real-time collaboration
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
          // Element already added, just ensure it's complete
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
            updated.set(userId, {
              userId,
              x,
              y,
              user,
            })
            return updated
          })

          // Remove cursor after 1 second of no update
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

    // Subscribe to whiteboard database updates (for persistence sync)
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
              // Only update if we don't have local changes (avoid overwriting real-time updates)
              setElements((prev) => {
                // Merge strategy: keep local elements that are newer
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

    // Listen for cursor updates via broadcast (real-time)
    channel.on("broadcast", { event: "cursor-move" }, (payload) => {
      const { userId, x, y, user } = payload.payload as any
      if (userId !== currentUser.id) {
        setCursors((prev) => {
          const updated = new Map(prev)
          updated.set(userId, {
            userId,
            x,
            y,
            user,
          })
          return updated
        })

        // Remove cursor after 1 second of no update
        setTimeout(() => {
          setCursors((prev) => {
            const updated = new Map(prev)
            updated.delete(userId)
            return updated
          })
        }, 1000)
      }
    })

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(whiteboardChannel)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      broadcastChannelRef.current = null
    }
  }, [whiteboardId, currentUser.id, members])

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{className} - Whiteboard</h1>
          <p className="text-sm text-muted-foreground">Collaborative whiteboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b px-6 py-3 flex items-center gap-4" style={{ backgroundColor: `${classColor}10` }}>
        <div className="flex items-center gap-2">
          <Button
            variant={tool === "draw" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("draw")}
            style={tool === "draw" ? { backgroundColor: classColor } : {}}
          >
            <PenTool className="h-4 w-4 mr-2" />
            Draw
          </Button>
          <Button
            variant={tool === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTool("image")
              fileInputRef.current?.click()
            }}
            style={tool === "image" ? { backgroundColor: classColor } : {}}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </Button>
          <Button
            variant={tool === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("text")}
            style={tool === "text" ? { backgroundColor: classColor } : {}}
          >
            <Type className="h-4 w-4 mr-2" />
            Text
          </Button>
        </div>

        {tool === "draw" && (
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0 cursor-crosshair"
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
    </div>
  )
}

