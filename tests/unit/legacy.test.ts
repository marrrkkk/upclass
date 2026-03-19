vi.mock("@excalidraw/excalidraw", () => ({
  convertToExcalidrawElements: (elements: unknown[]) => elements,
  serializeAsJSON: (
    elements: unknown[],
    appState: unknown,
    files: unknown,
  ) =>
    JSON.stringify({
      type: "excalidraw",
      version: 1,
      elements,
      appState,
      files,
    }),
}))

import { resolveWhiteboardSnapshotDocument } from "@/whiteboard/utils/legacy"

describe("resolveWhiteboardSnapshotDocument", () => {
  it("returns a valid excalidraw document unchanged", () => {
    const document = {
      type: "excalidraw",
      version: 1,
      elements: [],
      appState: null,
      files: {},
    } as const

    expect(resolveWhiteboardSnapshotDocument({ document })).toBe(document)
  })

  it("returns null for unsupported inputs", () => {
    expect(resolveWhiteboardSnapshotDocument({ document: null })).toBeNull()
    expect(
      resolveWhiteboardSnapshotDocument({
        document: { type: "something-else" },
        legacyData: "not-json",
      }),
    ).toBeNull()
  })

  it("converts legacy rectangle data into an excalidraw snapshot", () => {
    const result = resolveWhiteboardSnapshotDocument({
      document: {},
      legacyData: JSON.stringify([
        {
          id: "rect-1",
          type: "rectangle",
          data: {
            x: 24,
            y: 40,
            width: 240,
            height: 120,
          },
        },
      ]),
    })

    expect(result?.type).toBe("excalidraw")
    expect(result?.elements).toHaveLength(1)
  })

  it("converts legacy image data URLs and preserves the file reference", () => {
    const result = resolveWhiteboardSnapshotDocument({
      document: {},
      legacyData: JSON.stringify([
        {
          id: "image-1",
          type: "image",
          data: {
            x: 10,
            y: 20,
            width: 320,
            height: 180,
            url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
          },
        },
      ]),
    })

    expect(result?.type).toBe("excalidraw")
    expect(result?.elements).toHaveLength(1)
    expect(result?.files).toHaveProperty("image-1")
  })
})
