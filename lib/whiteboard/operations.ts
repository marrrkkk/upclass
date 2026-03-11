import {
  parseWhiteboardData,
} from "@/components/whiteboard/whiteboard-utils"
import type {
  WhiteboardElement,
  WhiteboardOperation,
  WhiteboardOperationInput,
  WhiteboardOperationPayload,
} from "@/types/whiteboard"

type OperationRow = {
  id: string
  whiteboardId: string
  userId: string
  sequence: number
  opType: string
  payload: string
  createdAt: Date
}

type OperationLike = Pick<WhiteboardOperationInput | WhiteboardOperation, "type" | "payload">

function isElementPayload(payload: WhiteboardOperationPayload): payload is { element: WhiteboardElement } {
  return "element" in payload
}

function isElementIdPayload(payload: WhiteboardOperationPayload): payload is { elementId: string } {
  return "elementId" in payload
}

export function parseOperationPayload(payload: string): WhiteboardOperationPayload {
  return JSON.parse(payload) as WhiteboardOperationPayload
}

export function deserializeWhiteboardOperation(row: OperationRow): WhiteboardOperation {
  const payload = parseOperationPayload(row.payload)

  switch (row.opType) {
    case "element_add":
      if (!isElementPayload(payload)) {
        throw new Error("Invalid element_add whiteboard payload")
      }
      return {
        id: row.id,
        whiteboardId: row.whiteboardId,
        userId: row.userId,
        sequence: row.sequence,
        type: "element_add",
        payload,
        createdAt: row.createdAt.toISOString(),
      }
    case "element_update":
      if (!isElementPayload(payload)) {
        throw new Error("Invalid element_update whiteboard payload")
      }
      return {
        id: row.id,
        whiteboardId: row.whiteboardId,
        userId: row.userId,
        sequence: row.sequence,
        type: "element_update",
        payload,
        createdAt: row.createdAt.toISOString(),
      }
    case "element_remove":
      if (!isElementIdPayload(payload)) {
        throw new Error("Invalid element_remove whiteboard payload")
      }
      return {
        id: row.id,
        whiteboardId: row.whiteboardId,
        userId: row.userId,
        sequence: row.sequence,
        type: "element_remove",
        payload,
        createdAt: row.createdAt.toISOString(),
      }
    case "clear":
      return {
        id: row.id,
        whiteboardId: row.whiteboardId,
        userId: row.userId,
        sequence: row.sequence,
        type: "clear",
        payload: {},
        createdAt: row.createdAt.toISOString(),
      }
    default:
      throw new Error(`Unsupported whiteboard operation type: ${row.opType}`)
  }
}

export function applyWhiteboardOperation(
  elements: WhiteboardElement[],
  operation: OperationLike,
) {
  switch (operation.type) {
    case "element_add": {
      if (!isElementPayload(operation.payload)) {
        return elements
      }
      const element = operation.payload.element
      const existingIndex = elements.findIndex((entry) => entry.id === element.id)
      if (existingIndex === -1) {
        return [...elements, element]
      }

      const nextElements = [...elements]
      nextElements[existingIndex] = element
      return nextElements
    }
    case "element_update":
      if (!isElementPayload(operation.payload)) {
        return elements
      }
      const updatePayload = operation.payload
      return elements.map((entry) =>
        entry.id === updatePayload.element.id ? updatePayload.element : entry,
      )
    case "element_remove":
      if (!isElementIdPayload(operation.payload)) {
        return elements
      }
      const removePayload = operation.payload
      return elements.filter((entry) => entry.id !== removePayload.elementId)
    case "clear":
      return []
    default:
      return elements
  }
}

export function buildSnapshotFromOperations(
  snapshotData: string,
  operations: OperationLike[],
) {
  return operations.reduce(
    (current, operation) => applyWhiteboardOperation(current, operation),
    parseWhiteboardData(snapshotData),
  )
}
