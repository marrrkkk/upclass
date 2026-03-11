export type WhiteboardTool =
  | "draw"
  | "image"
  | "text"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "select"

export type WhiteboardPoint = {
  x: number
  y: number
}

export type WhiteboardUser = {
  id: string
  name: string
  image: string | null
}

export type DrawElementData = {
  points: WhiteboardPoint[]
  color: string
  width: number
}

export type ImageElementData = {
  url: string
  x: number
  y: number
  width: number
  height: number
}

export type TextElementData = {
  text: string
  x: number
  y: number
  color: string
  fontSize: number
}

export type BoxElementData = {
  x: number
  y: number
  width: number
  height: number
  color: string
  lineWidth: number
}

export type LineElementData = {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  lineWidth: number
}

export type DrawElement = {
  id: string
  type: "draw"
  data: DrawElementData
  userId: string
  createdAt: number
}

export type ImageElement = {
  id: string
  type: "image"
  data: ImageElementData
  userId: string
  createdAt: number
}

export type TextElement = {
  id: string
  type: "text"
  data: TextElementData
  userId: string
  createdAt: number
}

export type RectangleElement = {
  id: string
  type: "rectangle"
  data: BoxElementData
  userId: string
  createdAt: number
}

export type CircleElement = {
  id: string
  type: "circle"
  data: BoxElementData
  userId: string
  createdAt: number
}

export type LineElement = {
  id: string
  type: "line"
  data: LineElementData
  userId: string
  createdAt: number
}

export type ArrowElement = {
  id: string
  type: "arrow"
  data: LineElementData
  userId: string
  createdAt: number
}

export type WhiteboardElement =
  | DrawElement
  | ImageElement
  | TextElement
  | RectangleElement
  | CircleElement
  | LineElement
  | ArrowElement

export type SelectableWhiteboardElement = Exclude<WhiteboardElement, DrawElement>

export type CursorData = {
  userId: string
  x: number
  y: number
  user: WhiteboardUser
}

export type SelectionState = {
  elementId: string | null
  isDragging: boolean
  isResizing: boolean
  resizeHandle: string | null
  dragStart: WhiteboardPoint | null
}

export type WhiteboardClientProps = {
  whiteboardId: string
  classId: string
  className: string
  classColor: string
  initialData: string
  initialSequence: number
  currentUser: WhiteboardUser
}

export type WhiteboardOperationType =
  | "element_add"
  | "element_update"
  | "element_remove"
  | "clear"

export type WhiteboardOperationPayload =
  | { element: WhiteboardElement }
  | { elementId: string }
  | Record<string, never>

export type WhiteboardOperationInput =
  | {
      type: "element_add"
      payload: { element: WhiteboardElement }
    }
  | {
      type: "element_update"
      payload: { element: WhiteboardElement }
    }
  | {
      type: "element_remove"
      payload: { elementId: string }
    }
  | {
      type: "clear"
      payload: Record<string, never>
    }

export type WhiteboardOperation = WhiteboardOperationInput & {
  id: string
  whiteboardId: string
  userId: string
  sequence: number
  createdAt: string
}
