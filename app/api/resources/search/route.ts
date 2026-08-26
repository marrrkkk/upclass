import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import { resourceChunks, resources, user } from "@/db/schema"
import { auth } from "@/lib/auth"
import { generateEmbedding } from "@/lib/ai/embeddings"
import { isSemanticSearchEnabled } from "@/lib/ai/policy"
import { getOrganizationMembership } from "@/lib/org-validation"
import { rankResourceHits } from "@/lib/resources/semantic-search"

const MAX_CHUNK_ROWS = 2_000

/**
 * Semantic resource search for the current org: embeds the query and ranks
 * org resources by best chunk similarity (lexical boost included). Falls
 * back to title/description matching when embeddings are unavailable.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = new URL(request.url).searchParams
  const orgSlug = params.get("orgSlug") ?? ""
  const query = (params.get("q") ?? "").trim().slice(0, 200)
  if (!orgSlug || query.length < 2) {
    return NextResponse.json({ error: "orgSlug and q are required" }, { status: 400 })
  }

  const membership = await getOrganizationMembership(session.user.id, orgSlug)
  if (!membership) return NextResponse.json({ error: "Organization access required" }, { status: 403 })

  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      category: resources.category,
      fileUrl: resources.fileUrl,
      fileName: resources.fileName,
      fileType: resources.fileType,
      fileSize: resources.fileSize,
      createdAt: resources.createdAt,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(resources)
    .innerJoin(user, eq(resources.ownerId, user.id))
    .where(eq(resources.orgId, membership.orgId))
    .orderBy(desc(resources.createdAt))
    .limit(300)

  if (rows.length === 0) return NextResponse.json({ results: [], semantic: false })

  let semantic = false
  let rankedIds: Array<{ resourceId: string; score: number }> = []

  if (isSemanticSearchEnabled()) {
    const queryEmbedding = await generateEmbedding(query).catch(() => null)
    if (queryEmbedding) {
      const chunkRows = await db
        .select({
          resourceId: resourceChunks.resourceId,
          content: resourceChunks.content,
          embedding: resourceChunks.embedding,
        })
        .from(resourceChunks)
        .where(and(eq(resourceChunks.orgId, membership.orgId), inArray(resourceChunks.resourceId, rows.map((row) => row.id))))
        .limit(MAX_CHUNK_ROWS)
        .catch(() => [])

      if (chunkRows.length > 0) {
        rankedIds = rankResourceHits(chunkRows, queryEmbedding, query, 12)
        semantic = true
      }
    }
  }

  // Lexical fallback / merge: keep semantic order first, then append any
  // metadata matches so short queries never return an empty page.
  if (!semantic) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const lexical = rows.filter((row) => {
      const haystack = [row.title, row.description, row.category, row.fileName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return words.every((word) => haystack.includes(word))
    })
    rankedIds = lexical.slice(0, 12).map((row) => ({ resourceId: row.id, score: 0 }))
  }

  const byId = new Map(rows.map((row) => [row.id, row]))
  const results = rankedIds
    .map((entry) => byId.get(entry.resourceId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))

  return NextResponse.json({ results, semantic })
}
