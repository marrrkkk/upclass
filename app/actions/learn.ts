"use server"

import { headers } from "next/headers"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/db"
import { studyCards, studyCollections, studyQuestions, studyQuizzes, studySessions, studySources } from "@/db/schema"
import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import { studyCardSchema, studyQuestionSchema, studyQuizSchema, studySpaceSchema } from "@/lib/validation/learn"

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
