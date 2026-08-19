/**
 * Orchestration memory retriever: wraps the RAG retriever with a char
 * budget and dedup for prompt assembly.
 */
import { retrieveMemories, type RetrievedMemory } from "@/lib/ai/memory/rag-retriever"

export const MEMORY_BUDGET_CHARS = 3_000
export const MEMORY_TOP_K = 5

export type ConversationMemoryResult = {
  memories: RetrievedMemory[]
  usedRag: boolean
}

export async function retrieveConversationMemories(params: {
  orgId: string
  query: string
  topK?: number
}): Promise<ConversationMemoryResult> {
  try {
    const { memories, usedRag } = await retrieveMemories({
      orgId: params.orgId,
      query: params.query,
      topK: params.topK ?? MEMORY_TOP_K,
    })

    if (memories.length === 0) return { memories: [], usedRag }

    let budget = MEMORY_BUDGET_CHARS
    const kept: RetrievedMemory[] = []
    for (const memory of memories) {
      const cost = memory.title.length + memory.content.length
      if (budget - cost < 0) break
      kept.push(memory)
      budget -= cost
    }

    return { memories: kept, usedRag }
  } catch (error) {
    console.warn("[ai-orchestrator] memory retrieval failed:", error)
    return { memories: [], usedRag: false }
  }
}