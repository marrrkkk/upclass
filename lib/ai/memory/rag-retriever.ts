/**
 * RAG memory retrieval pipeline for org knowledge.
 *
 * cosine similarity (app-side, no pgvector) with keyword boost and recency
 * decay, tiered by score. Degrades gracefully when no embedding provider is
 * configured (returns the newest memories with `usedRag: false`).
 */
import { desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { orgMemories } from "@/db/schema"
import {
  cosineSimilarity,
  generateEmbedding,
  type RankedItem,
} from "@/lib/ai/embeddings"
import type { AiMemoryCategory } from "@/lib/ai/types"

export const MEMORY_TOP_K = 5
export const MEMORY_PRIMARY_THRESHOLD = 0.45
export const MEMORY_FALLBACK_THRESHOLD = 0.3
export const MEMORY_KEYWORD_BOOST = 0.1
export const MEMORY_RECENCY_MAX_DECAY = 0.3
export const MEMORY_RECENCY_DAYS = 365
/** Hard cap on candidate memories scanned per retrieval call. */
export const MEMORY_CANDIDATE_LIMIT = 50

export type OrgMemoryRow = {
  id: string
  orgId: string
  title: string
  content: string
  position: number
  embedding: number[] | null
  category: AiMemoryCategory
  createdAt: Date
  updatedAt: Date
}

export type RetrievedMemory = {
  id: string
  title: string
  content: string
  category: AiMemoryCategory
  position: number
  similarity: number
  tier: "high" | "medium" | "low"
  createdAt: Date
  updatedAt: Date
}

export type RetrieveMemoriesResult = {
  memories: RetrievedMemory[]
  usedRag: boolean
  queryEmbedding: number[] | null
}

/** Exported for evaluation harnesses — pure scoring helpers. */
export function getKeywordBoost(query: string, memory: { title: string; content: string }): number {
  const keywords = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4)
  if (keywords.length === 0) return 0

  const haystack = `${memory.title} ${memory.content}`.toLowerCase()
  const hits = keywords.filter((keyword) => haystack.includes(keyword)).length
  if (hits === 0) return 0
  return Math.min(MEMORY_KEYWORD_BOOST * hits, MEMORY_KEYWORD_BOOST * 2)
}

/** Exported for evaluation harnesses — pure scoring helpers. */
export function getRecencyDecay(createdAt: Date, now = Date.now()): number {
  const ageDays = Math.max(0, (now - createdAt.getTime()) / 86_400_000)
  if (ageDays >= MEMORY_RECENCY_DAYS) return MEMORY_RECENCY_MAX_DECAY
  return (ageDays / MEMORY_RECENCY_DAYS) * MEMORY_RECENCY_MAX_DECAY
}

export async function getAllOrgMemories(orgId: string): Promise<OrgMemoryRow[]> {
  return db
    .select()
    .from(orgMemories)
    .where(eq(orgMemories.orgId, orgId))
    .orderBy(desc(orgMemories.position), desc(orgMemories.createdAt))
    .limit(MEMORY_CANDIDATE_LIMIT)
}

function toRetrieved(
  item: RankedItem<OrgMemoryRow>,
): RetrievedMemory {
  const similarity = Math.min(1, Math.max(0, item.similarity))
  const tier = similarity >= 0.7 ? "high" : similarity >= 0.55 ? "medium" : "low"
  return {
    id: item.item.id,
    title: item.item.title,
    content: item.item.content,
    category: item.item.category,
    position: item.item.position,
    similarity,
    tier,
    createdAt: item.item.createdAt,
    updatedAt: item.item.updatedAt,
  }
}

/**
 * Retrieve the most relevant org memories for a query.
 */
export async function retrieveMemories(options: {
  orgId: string
  query: string
  topK?: number
  threshold?: number
  category?: AiMemoryCategory | null
}): Promise<RetrieveMemoriesResult> {
  const topK = Math.min(10, Math.max(1, options.topK ?? MEMORY_TOP_K))
  const threshold = options.threshold ?? MEMORY_PRIMARY_THRESHOLD
  const now = Date.now()

  let memories = await getAllOrgMemories(options.orgId)
  if (options.category) {
    memories = memories.filter((memory) => memory.category === options.category)
  }
  if (memories.length === 0) {
    return { memories: [], usedRag: false, queryEmbedding: null }
  }

  const queryEmbedding = await generateEmbedding(options.query)

  if (!queryEmbedding) {
    // No embedding provider: graceful degradation — newest memories, no RAG flag.
    const degraded = memories
      .slice(0, topK)
      .map((memory) => toRetrieved({ item: memory, similarity: 0 }))
    return { memories: degraded, usedRag: false, queryEmbedding: null }
  }

  const scored = memories.map((memory) => {
    const similarity = memory.embedding
      ? cosineSimilarity(memory.embedding, queryEmbedding)
      : 0
    const boosted = Math.min(
      1,
      similarity + getKeywordBoost(options.query, memory) - getRecencyDecay(memory.createdAt, now),
    )
    return { item: memory, similarity: boosted }
  })

  let ranked = scored.sort((a, b) => b.similarity - a.similarity)
  const passing = ranked.filter((entry) => entry.similarity >= threshold)
  if (passing.length === 0) {
    ranked = ranked.filter((entry) => entry.similarity >= MEMORY_FALLBACK_THRESHOLD)
  }

  return {
    memories: ranked.slice(0, topK).map((entry) => toRetrieved(entry)),
    usedRag: true,
    queryEmbedding,
  }
}