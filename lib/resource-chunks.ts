import { createHash } from "node:crypto"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { resourceChunks } from "@/db/schema"
import {
  EMBEDDING_VERSION,
  generateEmbedding,
  generateEmbeddings,
  getActiveEmbeddingIdentity,
  cosineSimilarity,
} from "@/lib/ai/embeddings"

export const CHUNK_TARGET_CHARS = 3_200
export const CHUNK_OVERLAP_CHARS = 480
export const RESOURCE_CHUNK_TOP_K = 6
export const RESOURCE_CONTEXT_CHAR_BUDGET = 10_000

export type ResourceChunk = typeof resourceChunks.$inferSelect

function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export function chunkResourceText(sourceText: string): string[] {
  const normalized = sourceText.replace(/\u0000/g, "").trim()
  if (!normalized) return []

  const paragraphs = normalized.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ""

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_TARGET_CHARS) {
      if (current) {
        chunks.push(current)
        current = ""
      }
      for (let start = 0; start < paragraph.length; start += CHUNK_TARGET_CHARS - CHUNK_OVERLAP_CHARS) {
        chunks.push(paragraph.slice(start, start + CHUNK_TARGET_CHARS).trim())
      }
      continue
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > CHUNK_TARGET_CHARS && current) {
      chunks.push(current)
      const overlap = current.slice(Math.max(0, current.length - CHUNK_OVERLAP_CHARS))
      current = `${overlap}\n\n${paragraph}`.trim()
    } else {
      current = candidate
    }
  }

  if (current) chunks.push(current)
  return chunks.filter(Boolean)
}

export async function ensureResourceChunks(resource: {
  id: string
  orgId: string
  aiSourceText: string | null
}): Promise<void> {
  if (!resource.aiSourceText?.trim()) return
  const chunks = chunkResourceText(resource.aiSourceText)
  if (!chunks.length) return

  try {

  const existing = await db
    .select({ id: resourceChunks.id, contentHash: resourceChunks.contentHash })
    .from(resourceChunks)
    .where(eq(resourceChunks.resourceId, resource.id))
  const same = existing.length === chunks.length && existing.every((row, index) => row.contentHash === hash(chunks[index]))
  if (same) return

  await db.delete(resourceChunks).where(eq(resourceChunks.resourceId, resource.id))
  const identity = getActiveEmbeddingIdentity()
  const vectors = await generateEmbeddings(chunks)
  await db.insert(resourceChunks).values(
    chunks.map((content, chunkIndex) => ({
      id: crypto.randomUUID(),
      resourceId: resource.id,
      orgId: resource.orgId,
      chunkIndex,
      content,
      contentHash: hash(content),
      embedding: vectors[chunkIndex],
      embeddingModel: identity?.modelId ?? null,
      embeddingVersion: identity?.version ?? EMBEDDING_VERSION,
    })),
  )
  } catch (error) {
    console.warn("[resource-chunks] ingestion unavailable:", error)
  }
}

export async function retrieveResourceChunks(params: {
  resourceId: string
  orgId: string
  query: string
  topK?: number
}): Promise<ResourceChunk[]> {
  let rows: ResourceChunk[]
  try {
    rows = await db
    .select()
    .from(resourceChunks)
    .where(and(eq(resourceChunks.resourceId, params.resourceId), eq(resourceChunks.orgId, params.orgId)))
    .orderBy(asc(resourceChunks.chunkIndex))
  } catch (error) {
    console.warn("[resource-chunks] retrieval unavailable:", error)
    return []
  }
  if (!rows.length) return []

  const queryEmbedding = await generateEmbedding(params.query)
  const identity = getActiveEmbeddingIdentity()
  const ranked = rows.map((row) => {
    const compatible = Boolean(
      queryEmbedding && row.embedding && identity &&
      row.embeddingModel === identity.modelId && row.embeddingVersion === identity.version,
    )
    const lexical = params.query.toLowerCase().split(/\s+/).filter((word) => word.length > 3)
      .reduce((score, word) => score + (row.content.toLowerCase().includes(word) ? 0.08 : 0), 0)
    return { row, score: compatible ? cosineSimilarity(row.embedding!, queryEmbedding!) + lexical : lexical }
  })

  ranked.sort((a, b) => b.score - a.score)
  const kept: ResourceChunk[] = []
  let budget = RESOURCE_CONTEXT_CHAR_BUDGET
  for (const entry of ranked.slice(0, Math.min(10, params.topK ?? RESOURCE_CHUNK_TOP_K))) {
    if (budget - entry.row.content.length < 0) continue
    kept.push(entry.row)
    budget -= entry.row.content.length
  }
  return kept.sort((a, b) => a.chunkIndex - b.chunkIndex)
}
