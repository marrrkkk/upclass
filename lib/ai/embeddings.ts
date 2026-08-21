/**
 * App-side embeddings with a fallback provider chain.
 *
 * Chain: Gemini `gemini-embedding-001` (768d) -> `text-embedding-004` (768d)
 * -> Mistral `mistral-embed` (1024d). Embeddings are normalized to
 * `TARGET_DIMENSIONS` (Matryoshka truncation when longer, zero-padding when
 * shorter) and cached for 24h. Failures are non-fatal (null).
 */
import { createHash } from "node:crypto"

import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createMistral } from "@ai-sdk/mistral"
import { embed, embedMany, type EmbeddingModel } from "ai"

import { cacheGet, cacheSet, cacheDelete } from "@/lib/ai/cache-layer"

export const TARGET_DIMENSIONS = 768
export const EMBEDDING_VERSION = "v1"
const EMBEDDING_CACHE_TTL = 86_400
const MAX_BATCH_SIZE = 20

type EmbeddingChainEntry = { provider: string; modelId: string; dims: number }

const EMBEDDING_CHAIN: EmbeddingChainEntry[] = [
  { provider: "google", modelId: "gemini-embedding-001", dims: 768 },
  { provider: "google", modelId: "text-embedding-004", dims: 768 },
  { provider: "mistral", modelId: "mistral-embed", dims: 1024 },
]

function getEmbeddingModel(entry: EmbeddingChainEntry): EmbeddingModel | null {
  try {
    if (entry.provider === "google" && process.env.GEMINI_API_KEY) {
      return createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY }).embedding(
        entry.modelId,
      )
    }
    if (entry.provider === "mistral" && process.env.MISTRAL_API_KEY) {
      return createMistral({ apiKey: process.env.MISTRAL_API_KEY }).embedding(entry.modelId)
    }
    return null
  } catch (error) {
    console.warn(`[ai-embeddings] failed to build ${entry.provider}:${entry.modelId}:`, error)
    return null
  }
}

export function normalizeEmbedding(vector: number[], target = TARGET_DIMENSIONS): number[] {
  if (vector.length > target) return vector.slice(0, target)
  if (vector.length < target) return [...vector, ...Array(target - vector.length).fill(0)]
  return vector
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  if (length === 0) return 0

  let dot = 0
  let normA = 0
  let normB = 0
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index]
    normA += a[index] * a[index]
    normB += b[index] * b[index]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function embeddingCacheKey(text: string, modelId: string): string {
  return `emb:${EMBEDDING_VERSION}:${modelId}:${createHash("sha256").update(text, "utf8").digest("hex")}`
}

function getConfiguredEmbeddingEntry(): EmbeddingChainEntry | null {
  const pinned = process.env.AI_EMBEDDING_MODEL
  const candidates = pinned
    ? EMBEDDING_CHAIN.filter((entry) => `${entry.provider}:${entry.modelId}` === pinned)
    : EMBEDDING_CHAIN
  return candidates.find((entry) => getEmbeddingModel(entry) !== null) ?? null
}

export function getActiveEmbeddingIdentity(): { modelId: string; version: string } | null {
  const entry = getConfiguredEmbeddingEntry()
  return entry
    ? { modelId: `${entry.provider}:${entry.modelId}`, version: EMBEDDING_VERSION }
    : null
}

/**
 * Generate an embedding for a single text (cached 24h). Returns null when no
 * embedding provider is configured or the call fails.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const entry = getConfiguredEmbeddingEntry()
  if (!entry) return null
  const modelId = `${entry.provider}:${entry.modelId}`
  const key = embeddingCacheKey(text, modelId)
  const cached = await cacheGet(key)
  if (cached !== null) {
    try {
      const parsed = JSON.parse(cached) as number[]
      if (Array.isArray(parsed)) return parsed
    } catch {
      // fall through to regeneration
    }
  }

  const model = getEmbeddingModel(entry)
  if (!model) return null

  try {
      const { embedding } = await embed({
        model,
        value: text,
        abortSignal: AbortSignal.timeout(15_000),
      })
      const normalized = normalizeEmbedding(embedding, TARGET_DIMENSIONS)
      await cacheSet(key, JSON.stringify(normalized), EMBEDDING_CACHE_TTL)
      return normalized
  } catch (error) {
    console.warn(`[ai-embeddings] embed failed on ${modelId}:`, error)
  }

  return null
}

/**
 * Batch-generate embeddings (max 20). Returns an array aligned with `texts`;
 * failed entries are null.
 */
export async function generateEmbeddings(texts: string[]): Promise<Array<number[] | null>> {
  const results: Array<number[] | null> = new Array(texts.length).fill(null)
  if (texts.length === 0) return results

  const entry = getConfiguredEmbeddingEntry()
  if (!entry) return results
  const modelId = `${entry.provider}:${entry.modelId}`
  const uncached: Array<{ index: number; text: string }> = []

  await Promise.all(
    texts.map(async (text, index) => {
      const key = embeddingCacheKey(text, modelId)
      const cached = await cacheGet(key)
      if (cached !== null) {
        try {
          const parsed = JSON.parse(cached) as number[]
          if (Array.isArray(parsed)) {
            results[index] = parsed
            return
          }
        } catch {
          // fall through
        }
      }
      uncached.push({ index, text })
    }),
  )

  if (uncached.length === 0) return results

  const model = getEmbeddingModel(entry)
  if (!model) return results

  const pending = uncached.filter((item) => results[item.index] === null)
  for (let offset = 0; offset < pending.length; offset += MAX_BATCH_SIZE) {
    const batch = pending.slice(offset, offset + MAX_BATCH_SIZE)
    try {
      const { embeddings } = await embedMany({
        model,
        values: batch.map((item) => item.text),
        abortSignal: AbortSignal.timeout(20_000),
      })
      for (let index = 0; index < batch.length; index += 1) {
        const normalized = normalizeEmbedding(embeddings[index] ?? [], TARGET_DIMENSIONS)
        results[batch[index].index] = normalized
        await cacheSet(embeddingCacheKey(batch[index].text, modelId), JSON.stringify(normalized), EMBEDDING_CACHE_TTL)
      }
    } catch (error) {
      console.warn(`[ai-embeddings] batch embed failed on ${modelId}:`, error)
    }
  }

  return results
}

/** Drop cached embeddings for the given texts (after content edits). */
export async function invalidateEmbeddingCache(texts: string[]): Promise<void> {
  const entry = getConfiguredEmbeddingEntry()
  if (!entry) return
  const modelId = `${entry.provider}:${entry.modelId}`
  await Promise.allSettled(texts.map((text) => cacheDelete(embeddingCacheKey(text, modelId))))
}

export type RankedItem<T> = { item: T; similarity: number }

/** Rank items by cosine similarity to the query embedding, topK first. */
export function rankBySimilarity<T>(
  items: Array<{ item: T; embedding: number[] | null }>,
  queryEmbedding: number[],
  topK: number,
): RankedItem<T>[] {
  return items
    .map((entry) => ({
      item: entry.item,
      similarity: entry.embedding ? cosineSimilarity(entry.embedding, queryEmbedding) : 0,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(0, topK))
}
