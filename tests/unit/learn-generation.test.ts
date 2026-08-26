import { describe, expect, it } from "vitest"

import {
  chunkRefsFrom,
  extractFencedJson,
  generatedCardSchema,
  groundCards,
  groundQuestions,
  labelNotesAsChunks,
} from "@/lib/ai/learn-generation"

describe("labelNotesAsChunks", () => {
  it("labels every paragraph with a stable chunk index", () => {
    const labelled = labelNotesAsChunks("First paragraph.\n\nSecond paragraph.\n\nThird paragraph.")
    expect(labelled).toContain("[chunk-1]\nFirst paragraph.")
    expect(labelled).toContain("[chunk-2]\nSecond paragraph.")
    expect(labelled).toContain("[chunk-3]\nThird paragraph.")
  })

  it("drops empty paragraphs", () => {
    const labelled = labelNotesAsChunks("Only paragraph.")
    expect(labelled).toBe("[chunk-1]\nOnly paragraph.")
    expect(labelNotesAsChunks("   ")).toBe("")
  })
})

describe("chunkRefsFrom", () => {
  it("collects the chunk ids present in labelled text", () => {
    const refs = chunkRefsFrom("[chunk-1]\na\n\n[chunk-3]\nb")
    expect(refs.has("chunk-1")).toBe(true)
    expect(refs.has("chunk-3")).toBe(true)
    expect(refs.has("chunk-2")).toBe(false)
  })
})

describe("extractFencedJson", () => {
  it("parses fenced and bare JSON", () => {
    expect(extractFencedJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractFencedJson('{"b":2}')).toEqual({ b: 2 })
  })

  it("throws on malformed output", () => {
    expect(() => extractFencedJson("not json")).toThrow()
  })
})

describe("groundCards", () => {
  it("keeps only cards whose citations resolve to real chunks", () => {
    const validRefs = new Set(["chunk-1"])
    const grounded = groundCards(
      [
        { front: "Q1", back: "A1", sourceRefs: ["chunk-1"] },
        { front: "Q2", back: "A2", sourceRefs: ["chunk-9"] },
        { front: "Q3", back: "A3", sourceRefs: [] },
      ],
      validRefs,
    )
    expect(grounded).toHaveLength(1)
    expect(grounded[0].front).toBe("Q1")
  })

  it("strips invalid refs from partially-cited cards", () => {
    const grounded = groundCards(
      [{ front: "Q1", back: "A1", sourceRefs: ["chunk-1", "chunk-5"] }],
      new Set(["chunk-1"]),
    )
    expect(grounded[0].sourceRefs).toEqual(["chunk-1"])
  })
})

describe("groundQuestions", () => {
  it("filters questions without resolvable citations", () => {
    const questions = [
      { prompt: "P1?", options: ["a", "b"], correctAnswer: "a", sourceRefs: ["chunk-2"] },
      { prompt: "P2?", options: ["a", "b"], correctAnswer: "b", sourceRefs: ["chunk-404"] },
    ]
    const grounded = groundQuestions(questions, new Set(["chunk-2"]))
    expect(grounded).toHaveLength(1)
    expect(grounded[0].correctAnswer).toBe("a")
  })

  it("validates field lengths through the schema", () => {
    expect(generatedCardSchema.safeParse({ front: "front side", back: "back side" }).success).toBe(true)
    expect(generatedCardSchema.safeParse({ front: "no", back: "" }).success).toBe(false)
  })
})
