/**
 * Semantic resource ranking helpers.
 *
 * Embeddings live as jsonb number[] on resource_chunks and are scored in app
 * code (no pgvector yet). Lexical word overlap is added as a small boost so
 * exact terms still win ties and degraded (no-embedding) installs still work.
 */
import { cosineSimilarity } from "@/lib/ai/embeddings"

export type SearchChunkRow = {
  resourceId: string
  content: string
  embedding: number[] | null
}

export function queryWordsFrom(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter((word) => word.length > 2)
}

function lexicalScore(content: string, words: string[]): number {
  const haystack = content.toLowerCase()
  return words.reduce((score, word) => score + (haystack.includes(word) ? 0.08 : 0), 0)
}

/** Best chunk score per resource, ranked desc, topK resources. */
export function rankResourceHits(
  chunks: SearchChunkRow[],
  queryEmbedding: number[] | null,
  query: string,
  topK = 12,
): Array<{ resourceId: string; score: number }> {
  if (chunks.length === 0 || !query.trim()) return []
  const words = queryWordsFrom(query)

  const best = new Map<string, number>()
  for (const chunk of chunks) {
    const compatible = Boolean(queryEmbedding && chunk.embedding)
    const score =
      (compatible ? cosineSimilarity(chunk.embedding!, queryEmbedding!) : 0) +
      lexicalScore(chunk.content, words)
    const current = best.get(chunk.resourceId)
    if (current === undefined || score > current) {
      best.set(chunk.resourceId, score)
    }
  }

  return [...best.entries()]
    .map(([resourceId, score]) => ({ resourceId, score }))
    .filter((entry) => entry.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, topK))
}

/** Mean of available embeddings (up to `maxVectors`), or null. */
export function meanEmbedding(vectors: Array<number[] | null>, maxVectors = 5): number[] | null {
  const usable = vectors.filter((vector): vector is number[] => Boolean(vector?.length)).slice(0, maxVectors)
  if (usable.length === 0) return null
  const length = usable[0].length
  const sum = new Array(length).fill(0)
  for (const vector of usable) {
    if (vector.length !== length) continue
    for (let index = 0; index < length; index += 1) sum[index] += vector[index]
  }
  return sum.map((value) => value / usable.length)
}
