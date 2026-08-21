/**
 * Org memory CRUD with inline embedding.
 *
 * Callers must enforce the owner/admin gate — `requireMemoryAdminRole`
 * verifies it. Limit is 50 memories per org. Embedding failures are
 * non-fatal (embedding stays null; retrieval degrades gracefully).
 */
import { and, count, eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { orgMemories, orgMembership } from "@/db/schema"
import { generateEmbedding, getActiveEmbeddingIdentity, invalidateEmbeddingCache } from "@/lib/ai/embeddings"
import { sanitizeMemoryContent } from "@/lib/ai/security/input-sanitizer"
import type { OrgMemoryRow } from "@/lib/ai/memory/rag-retriever"
import type { AiMemoryCategory } from "@/lib/ai/types"

export const ORG_MEMORY_LIMIT = 50
export const ORG_MEMORY_TITLE_MAX = 200
export const ORG_MEMORY_CONTENT_MAX = 4_000

export type MemoryActionError =
  | "not_authorized"
  | "limit_reached"
  | "invalid_content"
  | "not_found"

export function isMemoryAdminRole(role: "owner" | "admin" | "member"): boolean {
  return role === "owner" || role === "admin"
}

export async function countOrgMemories(orgId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(orgMemories)
    .where(eq(orgMemories.orgId, orgId))
  return Number(row?.total ?? 0)
}

export async function listOrgMemories(orgId: string): Promise<OrgMemoryRow[]> {
  return db
    .select()
    .from(orgMemories)
    .where(eq(orgMemories.orgId, orgId))
    .orderBy(sql`${orgMemories.position} ASC, ${orgMemories.createdAt} ASC`)
}

export async function getOrgMemory(memoryId: string): Promise<OrgMemoryRow | null> {
  const rows = await db
    .select()
    .from(orgMemories)
    .where(eq(orgMemories.id, memoryId))
    .limit(1)
  return rows[0] ?? null
}

async function embedMemoryText(title: string, content: string): Promise<number[] | null> {
  return generateEmbedding(`${title}\n${content}`)
}

export type CreateOrgMemoryInput = {
  orgId: string
  title: string
  content: string
  category: AiMemoryCategory
}

export async function createOrgMemory(
  input: CreateOrgMemoryInput,
): Promise<{ ok: true; memory: OrgMemoryRow } | { ok: false; error: MemoryActionError }> {
  const sanitized = sanitizeMemoryContent(input.title, input.content)
  if (sanitized.status === "rejected") {
    return { ok: false, error: "invalid_content" }
  }

  const title = sanitized.title.slice(0, ORG_MEMORY_TITLE_MAX)
  const content = sanitized.content.slice(0, ORG_MEMORY_CONTENT_MAX)
  if (!title || !content) return { ok: false, error: "invalid_content" }

  const currentCount = await countOrgMemories(input.orgId)
  if (currentCount >= ORG_MEMORY_LIMIT) {
    return { ok: false, error: "limit_reached" }
  }

  const [maxPosition] = await db
    .select({ max: sql<number>`COALESCE(MAX(${orgMemories.position}), -1)::int`.as("max") })
    .from(orgMemories)
    .where(eq(orgMemories.orgId, input.orgId))

  const embedding = await embedMemoryText(title, content)
  const embeddingIdentity = getActiveEmbeddingIdentity()

  const rows = await db
    .insert(orgMemories)
    .values({
      id: crypto.randomUUID(),
      orgId: input.orgId,
      title,
      content,
      position: (Number(maxPosition?.max) ?? -1) + 1,
      embedding,
      embeddingModel: embeddingIdentity?.modelId ?? null,
      embeddingVersion: embeddingIdentity?.version ?? null,
      category: input.category,
    })
    .returning()

  return { ok: true, memory: rows[0] }
}

export async function updateOrgMemory(
  memoryId: string,
  orgId: string,
  input: { title?: string; content?: string; category?: AiMemoryCategory },
): Promise<{ ok: true; memory: OrgMemoryRow } | { ok: false; error: MemoryActionError }> {
  const existing = await getOrgMemory(memoryId)
  if (!existing || existing.orgId !== orgId) {
    return { ok: false, error: "not_found" }
  }

  const nextTitle = input.title ?? existing.title
  const nextContent = input.content ?? existing.content
  const sanitized = sanitizeMemoryContent(nextTitle, nextContent)
  if (sanitized.status === "rejected") {
    return { ok: false, error: "invalid_content" }
  }

  const title = sanitized.title.slice(0, ORG_MEMORY_TITLE_MAX)
  const content = sanitized.content.slice(0, ORG_MEMORY_CONTENT_MAX)
  if (!title || !content) return { ok: false, error: "invalid_content" }

  const contentChanged = content !== existing.content || title !== existing.title
  const embedding = contentChanged ? await embedMemoryText(title, content) : existing.embedding
  const embeddingIdentity = getActiveEmbeddingIdentity()

  if (contentChanged) {
    await invalidateEmbeddingCache([`${existing.title}\n${existing.content}`])
  }

  const rows = await db
    .update(orgMemories)
    .set({
      title,
      content,
      embedding,
      embeddingModel: contentChanged ? embeddingIdentity?.modelId ?? null : existing.embeddingModel,
      embeddingVersion: contentChanged ? embeddingIdentity?.version ?? null : existing.embeddingVersion,
      category: input.category ?? existing.category,
    })
    .where(and(eq(orgMemories.id, memoryId), eq(orgMemories.orgId, orgId)))
    .returning()

  return { ok: true, memory: rows[0] }
}

export async function deleteOrgMemory(
  memoryId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: MemoryActionError }> {
  const rows = await db
    .delete(orgMemories)
    .where(and(eq(orgMemories.id, memoryId), eq(orgMemories.orgId, orgId)))
    .returning({ id: orgMemories.id })
  return rows.length > 0 ? { ok: true } : { ok: false, error: "not_found" }
}

/** Admin gate: returns the org role when the user may manage memories. */
export async function requireMemoryAdminRole(
  userId: string,
  orgId: string,
): Promise<"owner" | "admin" | null> {
  const [membership] = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(and(eq(orgMembership.orgId, orgId), eq(orgMembership.userId, userId)))
    .limit(1)
  if (!membership) return null
  return membership.role === "owner" || membership.role === "admin" ? membership.role : null
}
