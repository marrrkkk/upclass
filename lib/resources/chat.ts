import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "@/db"
import {
  resourceAiChatMessages,
  resourceAiChatSessions,
  resourceDocumentChunks,
  resourceDocuments,
  resources,
} from "@/db/schema"
import { getAuthorizedResourceForUser, getClassMembershipForUser } from "@/lib/resources/auth"
import { embedTexts, createChatCompletion } from "@/lib/resources/openrouter"
import type { ResourceChatMessageDto, ResourceCitation } from "@/lib/resources/types"

type RetrievedChunk = {
  id: string
  resourceId: string
  fileName: string
  chunkIndex: number
  pageNumber: number | null
  sectionLabel: string | null
  chunkText: string
  similarity: number
}

const FALLBACK_ANSWER = "The uploaded materials for this class do not contain that answer."

function serializeChatMessage(
  message: typeof resourceAiChatMessages.$inferSelect,
): ResourceChatMessageDto {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.citations,
    createdAt: message.createdAt.toISOString(),
  }
}

function extractJsonPayload(content: string) {
  const fencedMatch = content.match(/```json\s*([\s\S]+?)```/i)
  const candidate = fencedMatch?.[1] ?? content

  try {
    const parsed = JSON.parse(candidate)
    if (parsed && typeof parsed === "object") {
      return parsed as { answer?: unknown; citations?: unknown }
    }
  } catch {
    // Ignore parsing failures and fall back below.
  }

  return null
}

function buildCitation(chunk: RetrievedChunk): ResourceCitation {
  return {
    chunkId: chunk.id,
    fileName: chunk.fileName,
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
    sectionLabel: chunk.sectionLabel,
  }
}

async function listSessionMessages(sessionId: string) {
  const rows = await db
    .select()
    .from(resourceAiChatMessages)
    .where(eq(resourceAiChatMessages.sessionId, sessionId))
    .orderBy(resourceAiChatMessages.createdAt)

  return rows.map(serializeChatMessage)
}

function getSessionScopeCondition(classId: string, resourceId?: string | null) {
  return resourceId
    ? and(
        eq(resourceAiChatSessions.classId, classId),
        eq(resourceAiChatSessions.resourceId, resourceId),
      )
    : and(eq(resourceAiChatSessions.classId, classId), isNull(resourceAiChatSessions.resourceId))
}

export async function getLatestResourceChatSession(args: {
  userId: string
  classId: string
  resourceId?: string | null
}) {
  const membership = await getClassMembershipForUser(args.userId, args.classId)
  if (!membership) {
    throw new Error("You do not have access to this class")
  }

  const sessionRows = await db
    .select()
    .from(resourceAiChatSessions)
    .where(
      and(
        eq(resourceAiChatSessions.userId, args.userId),
        getSessionScopeCondition(args.classId, args.resourceId),
      ),
    )
    .orderBy(desc(resourceAiChatSessions.updatedAt))
    .limit(1)

  const session = sessionRows[0] ?? null
  if (!session) {
    return {
      sessionId: null,
      messages: [] as ResourceChatMessageDto[],
    }
  }

  return {
    sessionId: session.id,
    messages: await listSessionMessages(session.id),
  }
}

async function retrieveRelevantChunks(args: {
  classId: string
  resourceId?: string | null
  queryEmbedding: number[]
  topK?: number
}) {
  const topK = args.topK ?? 8
  const vectorLiteral = `[${args.queryEmbedding.join(",")}]`
  const distanceExpression =
    sql<number>`${resourceDocumentChunks.embedding}::halfvec(2048) <=> ${vectorLiteral}::halfvec(2048)`
  const similarityExpression = sql<number>`1 - (${distanceExpression})`.as("similarity")

  const rows = await db
    .select({
      id: resourceDocumentChunks.id,
      resourceId: resourceDocumentChunks.resourceId,
      fileName: resources.fileName,
      chunkIndex: resourceDocumentChunks.chunkIndex,
      pageNumber: resourceDocumentChunks.pageNumber,
      sectionLabel: resourceDocumentChunks.sectionLabel,
      chunkText: resourceDocumentChunks.chunkText,
      similarity: similarityExpression,
    })
    .from(resourceDocumentChunks)
    .innerJoin(resources, eq(resources.id, resourceDocumentChunks.resourceId))
    .innerJoin(resourceDocuments, eq(resourceDocuments.id, resourceDocumentChunks.documentId))
    .where(
      args.resourceId
        ? and(
            eq(resourceDocumentChunks.classId, args.classId),
            eq(resourceDocumentChunks.resourceId, args.resourceId),
            eq(resourceDocuments.status, "ready"),
          )
        : and(
            eq(resourceDocumentChunks.classId, args.classId),
            eq(resourceDocuments.status, "ready"),
          ),
    )
    .orderBy(distanceExpression)
    .limit(topK)

  return rows as RetrievedChunk[]
}

function buildContextPrompt(chunks: RetrievedChunk[]) {
  return chunks
    .map((chunk, index) => {
      const label = `C${index + 1}`
      const location = chunk.pageNumber
        ? `page ${chunk.pageNumber}`
        : chunk.sectionLabel
          ? `${chunk.sectionLabel}, chunk ${chunk.chunkIndex + 1}`
          : `chunk ${chunk.chunkIndex + 1}`

      return `${label} | ${chunk.fileName} | ${location}\n${chunk.chunkText}`
    })
    .join("\n\n")
}

function mapCitationIds(
  citationIds: string[],
  chunks: RetrievedChunk[],
): ResourceCitation[] {
  const uniqueIds = Array.from(new Set(citationIds))
  const resolved: ResourceCitation[] = []

  for (const citationId of uniqueIds) {
    const match = /^C(\d+)$/.exec(citationId.trim())
    if (!match) continue
    const chunk = chunks[Number(match[1]) - 1]
    if (!chunk) continue
    resolved.push(buildCitation(chunk))
  }

  return resolved
}

export async function askResourceQuestion(args: {
  userId: string
  classId: string
  resourceId?: string | null
  sessionId?: string | null
  message: string
}) {
  const membership = await getClassMembershipForUser(args.userId, args.classId)
  if (!membership) {
    throw new Error("You do not have access to this class")
  }

  let resource = null
  if (args.resourceId) {
    resource = await getAuthorizedResourceForUser(args.resourceId, args.userId)
    if (!resource || resource.class.id !== args.classId) {
      throw new Error("Resource not found")
    }

    if (resource.aiStatus !== "ready") {
      throw new Error("This resource is not ready for AI questions yet")
    }
  }

  let sessionId = args.sessionId ?? null
  if (sessionId) {
    const rows = await db
      .select({ id: resourceAiChatSessions.id })
      .from(resourceAiChatSessions)
      .where(
        and(
          eq(resourceAiChatSessions.id, sessionId),
          eq(resourceAiChatSessions.userId, args.userId),
          eq(resourceAiChatSessions.classId, args.classId),
          args.resourceId
            ? eq(resourceAiChatSessions.resourceId, args.resourceId)
            : isNull(resourceAiChatSessions.resourceId),
        ),
      )
      .limit(1)

    if (!rows[0]) {
      throw new Error("Chat session not found")
    }
  }

  const [queryEmbedding] = await embedTexts([args.message])
  const retrievedChunks = await retrieveRelevantChunks({
    classId: args.classId,
    resourceId: args.resourceId,
    queryEmbedding,
  })
  const contextChunks = retrievedChunks.slice(0, 6)

  let answer = FALLBACK_ANSWER
  let citations: ResourceCitation[] = []

  if (contextChunks.length > 0) {
    const history = sessionId
      ? (await listSessionMessages(sessionId)).filter(
          (entry) => !(entry.role === "assistant" && entry.content === FALLBACK_ANSWER),
        )
      : []
    const historyMessages = history.slice(-8).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }))

    const completion = await createChatCompletion([
      {
        role: "system",
        content: [
          "You are UpClass Resources AI.",
          "Answer only from the provided context blocks in this request.",
          "Use conversation history only for follow-up phrasing, never as factual evidence.",
          `If the answer is not present in the context blocks, respond exactly with: "${FALLBACK_ANSWER}"`,
          'Return valid JSON with shape {"answer":"string","citations":["C1","C2"]}.',
          "Only cite chunk labels that appear in the context.",
          "Do not guess, infer, or complete missing facts from prior assistant replies.",
        ].join(" "),
      },
      ...historyMessages,
      {
        role: "user",
        content: [
          `Class scope: ${args.classId}`,
          args.resourceId ? `Resource scope: ${args.resourceId}` : "Resource scope: class-wide",
          "",
          "Context blocks:",
          buildContextPrompt(contextChunks),
          "",
          `Question: ${args.message}`,
        ].join("\n"),
      },
    ])

    const jsonPayload = extractJsonPayload(completion)
    const citationIds = Array.isArray(jsonPayload?.citations)
      ? jsonPayload?.citations.filter((entry): entry is string => typeof entry === "string")
      : []

    answer =
      typeof jsonPayload?.answer === "string" && jsonPayload.answer.trim()
        ? jsonPayload.answer.trim()
        : completion.trim()

    citations = mapCitationIds(citationIds, contextChunks)

    if (!citations.length && answer !== FALLBACK_ANSWER) {
      citations = contextChunks.slice(0, 2).map(buildCitation)
    }
  }

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    await db.insert(resourceAiChatSessions).values({
      id: sessionId,
      classId: args.classId,
      resourceId: args.resourceId ?? null,
      userId: args.userId,
      title: args.message.slice(0, 80),
    })
  }

  const now = new Date()
  const userMessageId = crypto.randomUUID()
  const assistantMessageId = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(resourceAiChatMessages).values({
      id: userMessageId,
      sessionId: sessionId!,
      role: "user",
      content: args.message,
      citations: [],
    })

    await tx.insert(resourceAiChatMessages).values({
      id: assistantMessageId,
      sessionId: sessionId!,
      role: "assistant",
      content: answer,
      citations,
    })

    await tx
      .update(resourceAiChatSessions)
      .set({
        title: sql`coalesce(${resourceAiChatSessions.title}, ${args.message.slice(0, 80)})`,
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(resourceAiChatSessions.id, sessionId!))
  })

  return {
    sessionId,
    message: {
      id: assistantMessageId,
      role: "assistant" as const,
      content: answer,
      citations,
      createdAt: now.toISOString(),
    },
  }
}
