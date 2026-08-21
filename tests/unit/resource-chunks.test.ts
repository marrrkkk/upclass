// @vitest-environment node

import { describe, expect, test } from "vitest"

import {
  CHUNK_OVERLAP_CHARS,
  CHUNK_TARGET_CHARS,
  chunkResourceText,
} from "@/lib/resource-chunks"

describe("chunkResourceText", () => {
  test("keeps short structured text in one deterministic chunk", () => {
    const source = "Introduction\n\nA derivative measures change.\n\nWorked example."
    expect(chunkResourceText(source)).toEqual(chunkResourceText(source))
    expect(chunkResourceText(source)).toEqual([source])
  })

  test("splits long paragraphs with bounded overlapping chunks", () => {
    const source = "calculus ".repeat(1_000)
    const chunks = chunkResourceText(source)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.length <= CHUNK_TARGET_CHARS)).toBe(true)
    expect(chunks[0].slice(-CHUNK_OVERLAP_CHARS).trim()).toContain(
      chunks[1].slice(0, CHUNK_OVERLAP_CHARS).trim().slice(0, 100),
    )
  })

  test("returns no chunks for empty extracted text", () => {
    expect(chunkResourceText(" \n\n ")).toEqual([])
  })
})

