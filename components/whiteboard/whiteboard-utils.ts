import type {
  DrawElement,
  ImageElement,
  ImageElementData,
  LineElement,
  SelectableWhiteboardElement,
  TextElement,
  WhiteboardElement,
  WhiteboardOperationInput,
  WhiteboardPoint,
  WhiteboardTool,
} from "@/types/whiteboard"

type ShapeTool = Extract<WhiteboardTool, "rectangle" | "circle" | "line" | "arrow">

export function parseWhiteboardData(initialData: string): WhiteboardElement[] {
  if (!initialData) return []

  try {
    const parsed = JSON.parse(initialData)
    return Array.isArray(parsed) ? (parsed as WhiteboardElement[]) : []
  } catch {
    return []
  }
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function isSelectableElement(element: WhiteboardElement): element is SelectableWhiteboardElement {
  return element.type !== "draw"
}

export function isStrokeTool(tool: WhiteboardTool) {
  return tool === "draw" || tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow"
}

export function isShapeTool(tool: WhiteboardTool): tool is ShapeTool {
  return tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow"
}

export function createDrawElement(
  pos: WhiteboardPoint,
  color: string,
  lineWidth: number,
  userId: string,
): DrawElement {
  return {
    id: crypto.randomUUID(),
    type: "draw",
    data: {
      points: [pos],
      color,
      width: lineWidth,
    },
    userId,
    createdAt: Date.now(),
  }
}

export function createShapeElement(
  tool: ShapeTool,
  start: WhiteboardPoint,
  color: string,
  lineWidth: number,
  userId: string,
): WhiteboardElement {
  const base = {
    id: crypto.randomUUID(),
    type: tool,
    userId,
    createdAt: Date.now(),
  }

  if (tool === "line" || tool === "arrow") {
    return {
      ...base,
      data: {
        x1: start.x,
        y1: start.y,
        x2: start.x,
        y2: start.y,
        color,
        lineWidth,
      },
    } as LineElement
  }

  return {
    ...base,
    data: {
      x: start.x,
      y: start.y,
      width: 0,
      height: 0,
      color,
      lineWidth,
    },
  } as WhiteboardElement
}

export function createTextElement(
  text: string,
  position: WhiteboardPoint,
  color: string,
  fontSize: number,
  userId: string,
): TextElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    data: {
      text,
      x: position.x,
      y: position.y,
      color,
      fontSize,
    },
    userId,
    createdAt: Date.now(),
  }
}

export function createImageElement(
  data: ImageElementData,
  userId: string,
): ImageElement {
  return {
    id: crypto.randomUUID(),
    type: "image",
    data,
    userId,
    createdAt: Date.now(),
  }
}

export function getElementAt(
  elements: WhiteboardElement[],
  x: number,
  y: number,
  canvas: HTMLCanvasElement | null,
): WhiteboardElement | null {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index]

    if (element.type === "image") {
      const { x: ex, y: ey, width, height } = element.data
      if (x >= ex && x <= ex + width && y >= ey && y <= ey + height) {
        return element
      }
      continue
    }

    if (element.type === "text") {
      if (!canvas) continue
      const ctx = canvas.getContext("2d")
      if (!ctx) continue

      const { x: ex, y: ey, fontSize, text } = element.data
      ctx.font = `${fontSize}px Arial`
      const metrics = ctx.measureText(text)
      const width = metrics.width
      const height = fontSize

      if (x >= ex && x <= ex + width && y >= ey && y <= ey + height) {
        return element
      }
      continue
    }

    if (element.type === "rectangle" || element.type === "circle") {
      const { x: ex, y: ey, width, height } = element.data
      const minX = Math.min(ex, ex + width)
      const maxX = Math.max(ex, ex + width)
      const minY = Math.min(ey, ey + height)
      const maxY = Math.max(ey, ey + height)

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return element
      }
      continue
    }

    if (element.type === "line" || element.type === "arrow") {
      const { x1, y1, x2, y2, lineWidth } = element.data
      const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2)
      if (denominator === 0) continue

      const distance = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / denominator
      if (distance > (lineWidth || 3) + 5) continue

      const minX = Math.min(x1, x2)
      const maxX = Math.max(x1, x2)
      const minY = Math.min(y1, y2)
      const maxY = Math.max(y1, y2)

      if (x >= minX - 10 && x <= maxX + 10 && y >= minY - 10 && y <= maxY + 10) {
        return element
      }
    }
  }

  return null
}

export function getResizeHandle(
  x: number,
  y: number,
  element: SelectableWhiteboardElement,
  canvas: HTMLCanvasElement | null,
): string | null {
  if (element.type === "image") {
    const { x: ex, y: ey, width, height } = element.data
    const threshold = 12

    if (Math.abs(x - ex) < threshold && Math.abs(y - ey) < threshold) return "nw"
    if (Math.abs(x - (ex + width)) < threshold && Math.abs(y - ey) < threshold) return "ne"
    if (Math.abs(x - (ex + width)) < threshold && Math.abs(y - (ey + height)) < threshold) return "se"
    if (Math.abs(x - ex) < threshold && Math.abs(y - (ey + height)) < threshold) return "sw"
    return null
  }

  if (element.type === "text") {
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const { x: ex, y: ey, fontSize, text } = element.data
    ctx.font = `${fontSize}px Arial`
    const metrics = ctx.measureText(text)
    const width = metrics.width
    const height = fontSize
    const threshold = 8

    if (Math.abs(x - ex) < threshold && Math.abs(y - ey) < threshold) return "nw"
    if (Math.abs(x - (ex + width)) < threshold && Math.abs(y - ey) < threshold) return "ne"
    if (Math.abs(x - (ex + width)) < threshold && Math.abs(y - (ey + height)) < threshold) return "se"
    if (Math.abs(x - ex) < threshold && Math.abs(y - (ey + height)) < threshold) return "sw"
    return null
  }

  if (element.type === "rectangle" || element.type === "circle") {
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
    return null
  }

  const { x1, y1, x2, y2 } = element.data
  const threshold = 8
  if (Math.abs(x - x1) < threshold && Math.abs(y - y1) < threshold) return "start"
  if (Math.abs(x - x2) < threshold && Math.abs(y - y2) < threshold) return "end"
  return null
}

export function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  element: SelectableWhiteboardElement,
  classColor: string,
) {
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
    const handles = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]

    handles.forEach((handle) => {
      ctx.beginPath()
      ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
      ctx.fill()
      ctx.stroke()
    })
    return
  }

  if (element.type === "text") {
    const { x, y, fontSize, text } = element.data
    ctx.font = `${fontSize}px Arial`
    const metrics = ctx.measureText(text)
    const width = metrics.width
    const height = fontSize
    const handles = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ]

    handles.forEach((handle) => {
      ctx.beginPath()
      ctx.rect(handle.x - 4, handle.y - 4, 8, 8)
      ctx.fill()
      ctx.stroke()
    })
    return
  }

  const { x1, y1, x2, y2 } = element.data
  ;[
    { x: x1, y: y1 },
    { x: x2, y: y2 },
  ].forEach((handle) => {
    ctx.beginPath()
    ctx.arc(handle.x, handle.y, handleSize / 2, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()
  })
}

export function mergeWhiteboardElements(
  localElements: WhiteboardElement[],
  remoteElements: WhiteboardElement[],
) {
  const merged = [...remoteElements]

  localElements.forEach((localElement) => {
    const existingIndex = merged.findIndex((element) => element.id === localElement.id)
    if (existingIndex === -1) {
      merged.push(localElement)
      return
    }

    if (localElement.createdAt > merged[existingIndex].createdAt) {
      merged[existingIndex] = localElement
    }
  })

  return merged
}

export function createAddOperation(element: WhiteboardElement): WhiteboardOperationInput {
  return {
    type: "element_add",
    payload: { element },
  }
}

export function createUpdateOperation(element: WhiteboardElement): WhiteboardOperationInput {
  return {
    type: "element_update",
    payload: { element },
  }
}

export function createRemoveOperation(elementId: string): WhiteboardOperationInput {
  return {
    type: "element_remove",
    payload: { elementId },
  }
}

export function createClearOperation(): WhiteboardOperationInput {
  return {
    type: "clear",
    payload: {},
  }
}
