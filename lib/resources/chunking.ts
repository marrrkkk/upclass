import "server-only"

import type { ChunkedResourceBlock, ParsedResourceBlock } from "@/lib/resources/types"

const DEFAULT_CHUNK_SIZE = 1_200
const DEFAULT_CHUNK_OVERLAP = 200

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

function splitWithOverlap(text: string, maxLength: number, overlap: number) {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + maxLength, text.length)

    if (end < text.length) {
      const paragraphBoundary = text.lastIndexOf("\n\n", end)
      const lineBoundary = text.lastIndexOf("\n", end)
      const wordBoundary = text.lastIndexOf(" ", end)
      const boundary = [paragraphBoundary, lineBoundary, wordBoundary].find(
        (value) => value > start + Math.floor(maxLength * 0.6),
      )

      if (typeof boundary === "number" && boundary > start) {
        end = boundary
      }
    }

    const chunk = text.slice(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }

    if (end >= text.length) {
      break
    }

    start = Math.max(end - overlap, start + 1)
  }

  return chunks
}

export function estimateTokenCount(value: string) {
  return Math.max(1, Math.ceil(value.length / 4))
}

export function chunkResourceBlocks(
  blocks: ParsedResourceBlock[],
  maxLength = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
) {
  const chunkedBlocks: ChunkedResourceBlock[] = []
  let chunkIndex = 0

  for (const block of blocks) {
    const normalizedText = normalizeWhitespace(block.text)
    if (!normalizedText) continue

    for (const chunkText of splitWithOverlap(normalizedText, maxLength, overlap)) {
      chunkedBlocks.push({
        chunkIndex,
        text: chunkText,
        pageNumber: block.pageNumber ?? null,
        sectionLabel: block.sectionLabel ?? null,
        tokenCount: estimateTokenCount(chunkText),
      })
      chunkIndex += 1
    }
  }

  return chunkedBlocks
}
