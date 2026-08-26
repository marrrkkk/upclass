import { describe, expect, it } from "vitest"

import {
  meanEmbedding,
  queryWordsFrom,
  rankResourceHits,
  type SearchChunkRow,
} from "@/lib/resources/semantic-search"

function unit(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  return vector.map((value) => value / norm)
}

describe("queryWordsFrom", () => {
  it("keeps words longer than two characters", () => {
    expect(queryWordsFrom("The photosynthesis of algae")).toEqual(["the", "photosynthesis", "algae"])
    expect(queryWordsFrom("a an of")).toEqual([])
  })
})

describe("rankResourceHits", () => {
  const queryEmbedding = unit([1, 0, 0])

  function chunks(rows: Array<[string, number[], string]>): SearchChunkRow[] {
    return rows.map(([resourceId, embedding, content]) => ({
      resourceId,
      content,
      embedding: unit(embedding),
    }))
  }

  it("ranks resources by best chunk similarity with a lexical boost", () => {
    const rows = chunks([
      ["r1", [1, 0, 0], "completely unrelated words here"],
      ["r2", [0, 1, 0], "mentions photosynthesis explicitly"],
      ["r3", [0.9, 0.1, 0], "photosynthesis appears too"],
    ])

    const ranked = rankResourceHits(rows, queryEmbedding, "photosynthesis")
    expect(ranked[0].resourceId).toBe("r3")
    expect(ranked.map((entry) => entry.resourceId)).toContain("r2")
    expect(ranked).toHaveLength(3)
  })

  it("still returns lexical-only hits when no embeddings exist", () => {
    const rows: SearchChunkRow[] = [
      { resourceId: "r1", content: "the mitochondria is the powerhouse", embedding: null },
      { resourceId: "r2", content: "nothing relevant at all", embedding: null },
    ]
    const ranked = rankResourceHits(rows, null, "mitochondria powerhouse")
    expect(ranked.map((entry) => entry.resourceId)).toEqual(["r1"])
  })

  it("drops resources below the score floor and respects topK", () => {
    const rows: SearchChunkRow[] = [
      { resourceId: "weak", content: "no overlap whatsoever", embedding: null },
      ...Array.from({ length: 15 }, (_, index): SearchChunkRow => ({
        resourceId: `hit-${index}`,
        content: "matching keyword",
        embedding: null,
      })),
    ]
    const ranked = rankResourceHits(rows, null, "matching keyword", 12)
    expect(ranked).toHaveLength(12)
    expect(ranked.some((entry) => entry.resourceId === "weak")).toBe(false)
  })
})

describe("meanEmbedding", () => {
  it("averages up to maxVectors usable vectors", () => {
    const mean = meanEmbedding([[2, 0], [0, 2], [4, 4]], 2)
    expect(mean).toEqual([1, 1])
  })

  it("skips null vectors and returns null when nothing is usable", () => {
    expect(meanEmbedding([null, null])).toBeNull()
    expect(meanEmbedding([[1, 1], null])).toEqual([1, 1])
  })
})
