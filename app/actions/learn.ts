"use server"

import { headers } from "next/headers"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { classMembership, classes, classwork, resources, studyCards, studyCollections, studyQuestions, studyQuizzes, studySessions, studySources } from "@/db/schema"
import { auth } from "@/lib/auth"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"
import { resolveResourceAccess } from "@/lib/ai/access"
import {
  buildLearnSourceContext,
  generateStudyMaterial,
} from "@/lib/ai/learn-generation"
import { isLearnGenerationEnabled } from "@/lib/ai/policy"
import { getOrganizationMembership } from "@/lib/org-validation"
import {
  extractResourceText,
  ExtractionError,
} from "@/lib/resource-text-extraction"
import {
  saveGeneratedCardsSchema,
  saveGeneratedQuizSchema,
  studyCardSchema,
  studyQuestionSchema,
  studyQuizSchema,
  studySpaceSchema,
  studySourceNotesSchema,
} from "@/lib/validation/learn"

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function createStudyCollection(input: {
  orgSlug: string
  title: string
  description?: string
  sourceType?: string
  sourceId?: string
  cards: Array<{ front: string; back: string; hint?: string; explanation?: string; sourceRefs?: string[] }>
}) {
  const userId = await currentUser()
  if (!userId) return { success: false as const, error: "Unauthorized" }
  const membership = await getOrganizationMembership(userId, input.orgSlug)
  if (!membership) return { success: false as const, error: "Organization access required" }
  const parsed = studySpaceSchema.safeParse(input)
  if (!parsed.success || input.cards.length > 50) return { success: false as const, error: "Add a valid title" }
  const collectionId = crypto.randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(studyCollections).values({ id: collectionId, orgId: membership.orgId, studentId: userId, title: input.title.trim(), description: input.description?.trim() || null, sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null })
    if (input.cards.length > 0) {
      await tx.insert(studyCards).values(input.cards.map((card) => ({ id: crypto.randomUUID(), collectionId, front: card.front.trim(), back: card.back.trim(), hint: card.hint?.trim() || null, explanation: card.explanation?.trim() || null, sourceRefs: card.sourceRefs ?? [] })))
    }
  })
  return { success: true as const, collectionId }
}

export async function createStudySpace(input: { orgSlug: string; title: string; description?: string }) {
  return createStudyCollection({ ...input, cards: [] })
}

async function ownedCollection(orgSlug: string, collectionId: string) {
  const userId = await currentUser()
  if (!userId) return null
  const membership = await getOrganizationMembership(userId, orgSlug)
  if (!membership) return null
  const [collection] = await db.select().from(studyCollections).where(and(eq(studyCollections.id, collectionId), eq(studyCollections.studentId, userId), eq(studyCollections.orgId, membership.orgId))).limit(1)
  return collection ? { userId, membership, collection } : null
}

export async function saveStudyCard(input: { orgSlug: string; collectionId: string; cardId?: string; front: string; back: string; hint?: string; explanation?: string }) {
  const parsed = studyCardSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid card" }
  const owned = await ownedCollection(input.orgSlug, input.collectionId)
  if (!owned) return { success: false as const, error: "Study space not found" }
  const values = { front: parsed.data.front, back: parsed.data.back, hint: parsed.data.hint || null, explanation: parsed.data.explanation || null }
  if (input.cardId) {
    const [card] = await db.select({ id: studyCards.id }).from(studyCards).where(and(eq(studyCards.id, input.cardId), eq(studyCards.collectionId, input.collectionId))).limit(1)
    if (!card) return { success: false as const, error: "Card not found" }
    await db.update(studyCards).set(values).where(eq(studyCards.id, card.id))
    return { success: true as const, cardId: card.id }
  }
  const cardId = crypto.randomUUID()
  await db.insert(studyCards).values({ id: cardId, collectionId: input.collectionId, ...values })
  return { success: true as const, cardId }
}

export async function deleteStudyCard(input: { orgSlug: string; collectionId: string; cardId: string }) {
  if (!await ownedCollection(input.orgSlug, input.collectionId)) return { success: false as const, error: "Study space not found" }
  await db.delete(studyCards).where(and(eq(studyCards.id, input.cardId), eq(studyCards.collectionId, input.collectionId)))
  return { success: true as const }
}

export async function createStudyQuiz(input: { orgSlug: string; collectionId: string; title: string; description?: string }) {
  const parsed = studyQuizSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: "Add a valid quiz title" }
  if (!await ownedCollection(input.orgSlug, input.collectionId)) return { success: false as const, error: "Study space not found" }
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(studyQuizzes).where(eq(studyQuizzes.collectionId, input.collectionId))
  const quizId = crypto.randomUUID()
  await db.insert(studyQuizzes).values({ id: quizId, collectionId: input.collectionId, title: parsed.data.title, description: parsed.data.description || null, position: Number(count) })
  return { success: true as const, quizId }
}

export async function saveStudyQuestion(input: { orgSlug: string; quizId: string; questionId?: string; prompt: string; options: string[]; correctAnswer: string; explanation?: string; position?: number }) {
  const parsed = studyQuestionSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid question" }
  const [quiz] = await db.select({ collectionId: studyQuizzes.collectionId }).from(studyQuizzes).where(eq(studyQuizzes.id, input.quizId)).limit(1)
  if (!quiz || !await ownedCollection(input.orgSlug, quiz.collectionId)) return { success: false as const, error: "Quiz not found" }
  const values = { prompt: parsed.data.prompt, options: parsed.data.options, correctAnswer: parsed.data.correctAnswer, explanation: parsed.data.explanation || null, position: parsed.data.position ?? 0 }
  if (input.questionId) {
    await db.update(studyQuestions).set(values).where(and(eq(studyQuestions.id, input.questionId), eq(studyQuestions.quizId, input.quizId)))
    return { success: true as const, questionId: input.questionId }
  }
  const questionId = crypto.randomUUID()
  await db.insert(studyQuestions).values({ id: questionId, quizId: input.quizId, ...values })
  return { success: true as const, questionId }
}

export async function reviewStudyCard(input: { orgSlug: string; cardId: string; rating: "again" | "hard" | "good" | "easy" }) {
  const userId = await currentUser()
  if (!userId) return { success: false as const, error: "Unauthorized" }
  const membership = await getOrganizationMembership(userId, input.orgSlug)
  if (!membership) return { success: false as const, error: "Organization access required" }
  const [row] = await db.select({ card: studyCards, collection: studyCollections }).from(studyCards).innerJoin(studyCollections, eq(studyCards.collectionId, studyCollections.id)).where(and(eq(studyCards.id, input.cardId), eq(studyCollections.studentId, userId), eq(studyCollections.orgId, membership.orgId))).limit(1)
  if (!row) return { success: false as const, error: "Card not found" }
  const intervals = { again: 0, hard: Math.max(1, Math.round(row.card.intervalDays * 1.5) || 1), good: Math.max(2, Math.round(row.card.intervalDays ? row.card.intervalDays * 2.4 : 2)), easy: Math.max(4, Math.round(row.card.intervalDays ? row.card.intervalDays * 3.5 : 4)) }
  const due = new Date(Date.now() + intervals[input.rating] * 86_400_000)
  await db.update(studyCards).set({ dueAt: due, intervalDays: intervals[input.rating], ease: Math.max(130, row.card.ease + (input.rating === "easy" ? 15 : input.rating === "hard" ? -15 : input.rating === "again" ? -25 : 0)) }).where(eq(studyCards.id, input.cardId))
  return { success: true as const, dueAt: due.toISOString() }
}

export async function completeStudySession(input: { orgSlug: string; collectionId: string; mode: string; correct: number; total: number }) {
  const userId = await currentUser()
  if (!userId) return { success: false as const, error: "Unauthorized" }
  const membership = await getOrganizationMembership(userId, input.orgSlug)
  if (!membership) return { success: false as const, error: "Organization access required" }
  const [collection] = await db.select({ id: studyCollections.id }).from(studyCollections).where(and(eq(studyCollections.id, input.collectionId), eq(studyCollections.studentId, userId), eq(studyCollections.orgId, membership.orgId))).limit(1)
  if (!collection) return { success: false as const, error: "Collection not found" }
  await db.insert(studySessions).values({ id: crypto.randomUUID(), collectionId: collection.id, studentId: userId, mode: input.mode, correct: Math.max(0, input.correct), total: Math.max(0, input.total), completedAt: new Date() })
  return { success: true as const }
}

export async function getStudyCollection(orgSlug: string, collectionId: string) {
  const userId = await currentUser()
  if (!userId) return null
  const membership = await getOrganizationMembership(userId, orgSlug)
  if (!membership) return null
  const [collection] = await db.select().from(studyCollections).where(and(eq(studyCollections.id, collectionId), eq(studyCollections.studentId, userId), eq(studyCollections.orgId, membership.orgId))).limit(1)
  if (!collection) return null
  const [cards, quizzes, sources, sessions] = await Promise.all([
    db.select().from(studyCards).where(eq(studyCards.collectionId, collection.id)).orderBy(asc(studyCards.createdAt)),
    db.select().from(studyQuizzes).where(eq(studyQuizzes.collectionId, collection.id)).orderBy(asc(studyQuizzes.position)),
    db.select().from(studySources).where(eq(studySources.collectionId, collection.id)).orderBy(desc(studySources.createdAt)),
    db.select().from(studySessions).where(eq(studySessions.collectionId, collection.id)).orderBy(desc(studySessions.createdAt)).limit(10),
  ])
  const questions = quizzes.length ? await db.select().from(studyQuestions).where(inArray(studyQuestions.quizId, quizzes.map((quiz) => quiz.id))).orderBy(asc(studyQuestions.position)) : []
  return { collection, cards, quizzes: quizzes.map((quiz) => ({ ...quiz, questions: questions.filter((question) => question.quizId === quiz.id) })), sources, sessions }
}

/* -------------------------------------------------------------------------- */
/* AI-generated study material persistence                                     */
/* -------------------------------------------------------------------------- */

export async function saveGeneratedCards(input: unknown) {
  const parsed = saveGeneratedCardsSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid cards" }
  const owned = await ownedCollection(parsed.data.orgSlug, parsed.data.collectionId)
  if (!owned) return { success: false as const, error: "Study space not found" }
  const cardIds = parsed.data.cards.map(() => crypto.randomUUID())
  await db.insert(studyCards).values(parsed.data.cards.map((card, index) => ({
    id: cardIds[index],
    collectionId: parsed.data.collectionId,
    front: card.front,
    back: card.back,
    hint: card.hint || null,
    explanation: card.explanation || null,
    sourceRefs: card.sourceRefs,
  })))
  return { success: true as const, cardIds }
}

export async function saveGeneratedQuiz(input: unknown) {
  const parsed = saveGeneratedQuizSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid quiz" }
  const owned = await ownedCollection(parsed.data.orgSlug, parsed.data.collectionId)
  if (!owned) return { success: false as const, error: "Study space not found" }
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(studyQuizzes).where(eq(studyQuizzes.collectionId, parsed.data.collectionId))
  const quizId = crypto.randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(studyQuizzes).values({ id: quizId, collectionId: parsed.data.collectionId, title: parsed.data.title, position: Number(count) })
    await tx.insert(studyQuestions).values(parsed.data.questions.map((question, index) => ({
      id: crypto.randomUUID(),
      quizId,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || null,
      sourceRefs: question.sourceRefs,
      position: index,
    })))
  })
  return { success: true as const, quizId }
}

/* -------------------------------------------------------------------------- */
/* Study sources ingestion                                                     */
/* -------------------------------------------------------------------------- */

export async function addStudySourceNotes(input: unknown) {
  const parsed = studySourceNotesSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid source" }
  const owned = await ownedCollection(parsed.data.orgSlug, parsed.data.collectionId)
  if (!owned) return { success: false as const, error: "Study space not found" }
  const sourceId = crypto.randomUUID()
  await db.insert(studySources).values({
    id: sourceId,
    collectionId: parsed.data.collectionId,
    title: parsed.data.title,
    status: "ready",
    aiSourceText: parsed.data.text.slice(0, 60_000),
    processedAt: new Date(),
  })
  return { success: true as const, sourceId }
}

async function extractResourceTextForUser(userId: string, resource: typeof resources.$inferSelect): Promise<string> {
  if (resource.aiSourceText?.trim()) return resource.aiSourceText
  const text = await extractResourceText(resource)
  await db.update(resources).set({ aiSourceText: text }).where(eq(resources.id, resource.id))
  return text
}

export async function addStudySourceFromResource(input: { orgSlug: string; collectionId: string; resourceId: string }) {
  const userId = await currentUser()
  if (!userId) return { success: false as const, error: "Unauthorized" }
  const membership = await getOrganizationMembership(userId, input.orgSlug)
  if (!membership) return { success: false as const, error: "Organization access required" }
  const [collection] = await db.select().from(studyCollections).where(and(eq(studyCollections.id, input.collectionId), eq(studyCollections.studentId, userId), eq(studyCollections.orgId, membership.orgId))).limit(1)
  if (!collection) return { success: false as const, error: "Study space not found" }

  const [resource] = await db.select().from(resources).where(eq(resources.id, input.resourceId)).limit(1)
  if (!resource || resource.orgId !== membership.orgId || !(await resolveResourceAccess(userId, resource))) {
    return { success: false as const, error: "Resource not found" }
  }

  const existing = await db.select({ id: studySources.id }).from(studySources).where(and(eq(studySources.collectionId, collection.id), eq(studySources.resourceId, resource.id))).limit(1)
  if (existing.length > 0) return { success: false as const, error: "This resource is already a source here" }

  const sourceId = crypto.randomUUID()
  const startedAt = new Date()
  await db.insert(studySources).values({
    id: sourceId,
    collectionId: collection.id,
    resourceId: resource.id,
    title: resource.title,
    status: "processing",
    processingStartedAt: startedAt,
  })

  try {
    const text = await extractResourceTextForUser(userId, resource)
    await db.update(studySources).set({ status: "ready", aiSourceText: text, processedAt: new Date(), errorMessage: null }).where(eq(studySources.id, sourceId))
    return { success: true as const, sourceId, status: "ready" as const }
  } catch (error) {
    const message =
      error instanceof ExtractionError
        ? error.message
        : "This file could not be processed"
    await db.update(studySources).set({ status: "failed", errorMessage: message, processedAt: new Date() }).where(eq(studySources.id, sourceId))
    return { success: false as const, error: message, sourceId }
  }
}

export async function deleteStudySource(input: { orgSlug: string; collectionId: string; sourceId: string }) {
  if (!await ownedCollection(input.orgSlug, input.collectionId)) return { success: false as const, error: "Study space not found" }
  await db.delete(studySources).where(and(eq(studySources.id, input.sourceId), eq(studySources.collectionId, input.collectionId)))
  return { success: true as const }
}

/** Recent org resources the student can link as study sources. */
export async function listLinkableResources(orgSlug: string) {
  const userId = await currentUser()
  if (!userId) return []
  const membership = await getOrganizationMembership(userId, orgSlug)
  if (!membership) return []
  const rows = await db
    .select({ id: resources.id, title: resources.title, fileName: resources.fileName, fileType: resources.fileType, ownerId: resources.ownerId, hasText: sql<boolean>`${resources.aiSourceText} is not null` })
    .from(resources)
    .where(eq(resources.orgId, membership.orgId))
    .orderBy(desc(resources.createdAt))
    .limit(40)
  // Only offer resources the user may actually read.
  const allowed: Array<{ id: string; title: string; fileName: string; fileType: string; hasText: boolean }> = []
  for (const row of rows) {
    if (await resolveResourceAccess(userId, { id: row.id, ownerId: row.ownerId })) {
      allowed.push({ id: row.id, title: row.title, fileName: row.fileName, fileType: row.fileType, hasText: Boolean(row.hasText) })
    }
  }
  return allowed
}

/* -------------------------------------------------------------------------- */
/* Class-content -> study-space bridge                                         */
/* -------------------------------------------------------------------------- */

const bridgeInputSchema = z.object({
  orgSlug: z.string().min(1),
  resourceId: z.string().uuid(),
})

/**
 * One-click "Make a study set from this resource": verifies access, generates
 * grounded flashcards server-side, and persists the collection in one call.
 * The generation is rate-limited under the same "learn" budget as the API.
 */
export async function createStudyCollectionFromResource(input: { orgSlug: string; resourceId: string }) {
  const parsed = bridgeInputSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: "Invalid request" }
  const userId = await currentUser()
  if (!userId) return { success: false as const, error: "Unauthorized" }
  if (!isLearnGenerationEnabled()) return { success: false as const, error: "AI study generation is currently disabled" }
  const membership = await getOrganizationMembership(userId, parsed.data.orgSlug)
  if (!membership) return { success: false as const, error: "Organization access required" }

  const limit = await enforceAIRateLimit(userId, "learn")
  if (!limit.allowed) return { success: false as const, error: `You've reached the daily AI study limit (${limit.dailyLimit}).` }

  const [resource] = await db.select().from(resources).where(eq(resources.id, parsed.data.resourceId)).limit(1)
  if (!resource || resource.orgId !== membership.orgId || !(await resolveResourceAccess(userId, resource))) {
    return { success: false as const, error: "Resource not found" }
  }

  let context
  try {
    const text = await extractResourceTextForUser(userId, resource)
    context = await buildLearnSourceContext({
      orgId: resource.orgId,
      source: { type: "resource", resourceId: resource.id, text },
      topic: resource.title,
    })
    const result = await generateStudyMaterial({ mode: "flashcards", count: 10, difficulty: "standard", topic: resource.title, context })
    if (result.kind !== "cards" || result.cards.length === 0) {
      return { success: false as const, error: "No flashcards could be generated from this resource yet." }
    }
    const collectionId = crypto.randomUUID()
    await db.transaction(async (tx) => {
      await tx.insert(studyCollections).values({
        id: collectionId,
        orgId: membership.orgId,
        studentId: userId,
        title: resource.title,
        description: `Generated from ${resource.fileName}`,
        sourceType: "resource",
        sourceId: resource.id,
      })
      await tx.insert(studyCards).values(result.cards.map((card) => ({
        id: crypto.randomUUID(),
        collectionId,
        front: card.front,
        back: card.back,
        hint: card.hint || null,
        explanation: card.explanation || null,
        sourceRefs: card.sourceRefs,
      })))
      await tx.insert(studySources).values({
        id: crypto.randomUUID(),
        collectionId,
        resourceId: resource.id,
        title: resource.title,
        status: "ready",
        processedAt: new Date(),
      })
    })
    return { success: true as const, collectionId }
  } catch (error) {
    console.error("createStudyCollectionFromResource failed", error)
    return { success: false as const, error: "The study set could not be generated from this resource." }
  }
}

/**
 * One-click "Make a study set" from a class assignment/material: students
 * generate grounded flashcards from the classwork description.
 */
export async function createStudyCollectionFromClasswork(input: { orgSlug: string; classworkId: string }) {
  const parsed = z.object({ orgSlug: z.string().min(1), classworkId: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { success: false as const, error: "Invalid request" }
  const userId = await currentUser()
  if (!userId) return { success: false as const, error: "Unauthorized" }
  if (!isLearnGenerationEnabled()) return { success: false as const, error: "AI study generation is currently disabled" }
  const membership = await getOrganizationMembership(userId, parsed.data.orgSlug)
  if (!membership) return { success: false as const, error: "Organization access required" }

  const limit = await enforceAIRateLimit(userId, "learn")
  if (!limit.allowed) return { success: false as const, error: `You've reached the daily AI study limit (${limit.dailyLimit}).` }

  const [row] = await db
    .select({ item: classwork, classTitle: classes.title })
    .from(classwork)
    .innerJoin(classes, eq(classwork.classId, classes.id))
    .where(and(eq(classwork.id, parsed.data.classworkId), eq(classes.orgId, membership.orgId)))
    .limit(1)
  if (!row) return { success: false as const, error: "Classwork not found" }

  // Only members of the class can study from it.
  const [classMember] = await db
    .select({ role: classMembership.role })
    .from(classMembership)
    .where(and(eq(classMembership.classId, row.item.classId), eq(classMembership.userId, userId)))
    .limit(1)
  const isTeacher = membership.role === "owner" || membership.role === "admin"
  if (!classMember && !isTeacher) return { success: false as const, error: "You are not part of this class" }

  const notesText = `${row.item.title}\n\n${[row.item.description].filter(Boolean).join("\n\n")}`.trim()
  if (notesText.length < 40) {
    return { success: false as const, error: "This classwork has no description to study from yet." }
  }

  try {
    const context = await buildLearnSourceContext({ source: { type: "notes", text: notesText }, topic: row.item.title })
    const result = await generateStudyMaterial({ mode: "flashcards", count: 10, difficulty: "standard", topic: row.item.title, context })
    if (result.kind !== "cards" || result.cards.length === 0) {
      return { success: false as const, error: "No flashcards could be generated from this classwork." }
    }
    const collectionId = crypto.randomUUID()
    await db.transaction(async (tx) => {
      await tx.insert(studyCollections).values({
        id: collectionId,
        orgId: membership.orgId,
        studentId: userId,
        title: row.item.title,
        description: `Generated from ${row.classTitle} · ${row.item.type}`,
        sourceType: "classwork",
        sourceId: row.item.id,
      })
      await tx.insert(studyCards).values(result.cards.map((card) => ({
        id: crypto.randomUUID(),
        collectionId,
        front: card.front,
        back: card.back,
        hint: card.hint || null,
        explanation: card.explanation || null,
        sourceRefs: card.sourceRefs,
      })))
    })
    return { success: true as const, collectionId }
  } catch (error) {
    console.error("createStudyCollectionFromClasswork failed", error)
    return { success: false as const, error: "The study set could not be generated from this classwork." }
  }
}
