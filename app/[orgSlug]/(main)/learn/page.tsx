import type { Metadata } from "next"
import { and, desc, eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { organizations, studyCards, studyCollections, studyQuizzes, studySources } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { LearnPageClient } from "@/components/learn/learn-page-client"

export const metadata: Metadata = { title: "Learn" }

export default async function LearnPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const [{ orgSlug }, session] = await Promise.all([params, getOptionalSession()])
  if (!session?.user?.id) return null
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1)
  const spaces = org ? await db.select({ id: studyCollections.id, title: studyCollections.title, description: studyCollections.description, updatedAt: studyCollections.updatedAt, cardCount: sql<number>`count(distinct ${studyCards.id})`, quizCount: sql<number>`count(distinct ${studyQuizzes.id})`, sourceCount: sql<number>`count(distinct ${studySources.id})` }).from(studyCollections).leftJoin(studyCards, eq(studyCards.collectionId, studyCollections.id)).leftJoin(studyQuizzes, eq(studyQuizzes.collectionId, studyCollections.id)).leftJoin(studySources, eq(studySources.collectionId, studyCollections.id)).where(and(eq(studyCollections.orgId, org.id), eq(studyCollections.studentId, session.user.id), eq(studyCollections.archived, false))).groupBy(studyCollections.id).orderBy(desc(studyCollections.updatedAt)) : []
  return <LearnPageClient orgSlug={orgSlug} spaces={spaces.map((space) => ({ ...space, cardCount: Number(space.cardCount), quizCount: Number(space.quizCount), sourceCount: Number(space.sourceCount) }))} />
}
