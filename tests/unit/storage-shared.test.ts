import { describe, expect, it } from "vitest"

import {
  buildWhiteboardAssetPath,
  getBucketForPurpose,
  validateUploadFiles,
} from "@/lib/storage/shared"

describe("storage shared helpers", () => {
  it("returns the expected bucket for resource uploads", () => {
    expect(getBucketForPurpose("resource-file")).toBe("resource-files")
  })

  it("accepts supported resource files within limits", () => {
    expect(() =>
      validateUploadFiles("resource-file", [
        {
          name: "lesson-plan.pdf",
          size: 1024 * 1024,
          type: "application/pdf",
        },
      ]),
    ).not.toThrow()
  })

  it("rejects unsupported message media types", () => {
    expect(() =>
      validateUploadFiles("message-media", [
        {
          name: "archive.zip",
          size: 1024,
          type: "application/zip",
        },
      ]),
    ).toThrow(/unsupported file type/i)
  })

  it("rejects attachments beyond the allowed submission count", () => {
    expect(() =>
      validateUploadFiles(
        "submission-attachment",
        Array.from({ length: 6 }, (_, index) => ({
          name: `submission-${index + 1}.pdf`,
          size: 1024,
          type: "application/pdf",
        })),
      ),
    ).toThrow(/up to 5 files/i)
  })

  it("builds whiteboard asset paths under the boards prefix", () => {
    const path = buildWhiteboardAssetPath("Board 123", "Sketch Final.png")

    expect(path).toMatch(/^boards\/board-123\/sketch-final-[a-f0-9-]+\.png$/)
  })
})
