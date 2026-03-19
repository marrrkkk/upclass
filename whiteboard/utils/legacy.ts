import type { Editor } from "tldraw"

import { AssetRecordType } from "tldraw"

type LegacyElement = {
  id: string
  type: string
  data?: Record<string, unknown>
}

function parseLegacyData(legacyData: string | null) {
  if (!legacyData) return []

  try {
    const parsed = JSON.parse(legacyData)
    return Array.isArray(parsed) ? (parsed as LegacyElement[]) : []
  } catch {
    return []
  }
}

export async function importLegacyWhiteboardData(editor: Editor, legacyData: string | null) {
  const elements = parseLegacyData(legacyData)
  if (elements.length === 0) return false

  let createdShapeCount = 0

  for (const element of elements) {
    const data = element.data ?? {}

    if (element.type === "rectangle") {
      editor.createShape({
        type: "geo",
        x: Number(data.x ?? 0),
        y: Number(data.y ?? 0),
        props: {
          geo: "rectangle",
          w: Math.abs(Number(data.width ?? 0)) || 120,
          h: Math.abs(Number(data.height ?? 0)) || 80,
        },
      })
      createdShapeCount += 1
      continue
    }

    if (element.type === "circle") {
      editor.createShape({
        type: "geo",
        x: Number(data.x ?? 0),
        y: Number(data.y ?? 0),
        props: {
          geo: "ellipse",
          w: Math.abs(Number(data.width ?? 0)) || 120,
          h: Math.abs(Number(data.height ?? 0)) || 120,
        },
      })
      createdShapeCount += 1
      continue
    }

    if (element.type === "image" && typeof data.url === "string") {
      const width = Math.abs(Number(data.width ?? 240)) || 240
      const height = Math.abs(Number(data.height ?? 160)) || 160
      const assetId = AssetRecordType.createId(element.id)

      editor.createAssets([
        AssetRecordType.create({
          id: assetId,
          type: "image",
          props: {
            name: `legacy-${element.id}`,
            src: data.url,
            w: width,
            h: height,
            mimeType: null,
            isAnimated: false,
          },
          meta: {},
        }),
      ])

      editor.createShape({
        type: "image",
        x: Number(data.x ?? 0),
        y: Number(data.y ?? 0),
        props: {
          w: width,
          h: height,
          assetId,
          crop: null,
          playing: true,
          flipX: false,
          flipY: false,
          altText: "Imported legacy whiteboard image",
        },
      })
      createdShapeCount += 1
      continue
    }
  }

  return createdShapeCount > 0
}
