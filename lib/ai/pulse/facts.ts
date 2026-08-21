/**
 * Daily Class Pulse — facts engine (Phase 2).
 *
 * Aggregates a privacy-safe snapshot of classroom signals for the dashboard
 * Pulse card: deadlines, grading queue, overdue work, unread questions,
 * participation, and recent grades. All facts are pure database aggregates;
 * no student PII (names, emails, grades) leaves the server, and nothing is
 * persisted. Results are cached briefly to keep dashboard loads cheap.
 */
import { and, count, eq, gte, inArray, isNotNull, lt, or, sql } from "drizzle-orm"

import { db } from "@/db"
import {
  channelMessages,
  classChannels,
  classMembership,
  classes,
  classwork,
  messages,
  submissions,
} from "@/db/schema"
import { cacheGetJson, cacheSet } from "@/lib/ai/cache-layer"

export const PULSE_FACTS_TTL_SECONDS = 5 * 60
export const PULSE_LOOKBACK_DAYS = 7
export const PULSE_DEADLINE_WINDOW_DAYS = 7

export type PulseFact = {
  id: string
  label: string
  value: number
  detail?: string
  href?: string
}

export type PulseFacts = {
  role: "teacher" | "student"
  generatedAt: string
  facts: PulseFact[]
  nearestDeadline: { title: string; className: string; dueDate: string; classId: string } | null
}

const PULSE_DAYS_AGO = () => new Date(Date.now() - PULSE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
const PULSE_DEADLINE_END = () => new Date(Date.now() + PULSE_DEADLINE_WINDOW_DAYS * 24 * 60 * 60 * 1000)

async function getTeacherFacts(classIds: string[], userId: string): Promise<PulseFacts> {
  const reviewQueue = classIds.length
    ? await db
        .select({ count: count() })
        .from(submissions)
        .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
        .where(and(inArray(classwork.classId, classIds), eq(submissions.status, "submitted")))
    : [{ count: 0 }]

  const overdue = classIds.length
    ? await db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count
      FROM classwork cw
      INNER JOIN class_membership cm
        ON cm.class_id = cw.class_id
        AND cm.role = 'student'
      LEFT JOIN submissions s
        ON s.classwork_id = cw.id
        AND s.student_id = cm.user_id
      WHERE cw.class_id IN (${sql.join(classIds.map((entry) => sql`${entry}`), sql`, `)})
        AND cw.type IN ('assignment', 'quiz')
        AND cw.due_date IS NOT NULL
        AND cw.due_date < NOW()
        AND (s.id IS NULL OR s.status NOT IN ('submitted', 'graded'))
    `)
    : [{ count: 0 }]

  const directUnread = await db
    .select({ count: count() })
    .from(messages)
    .where(and(eq(messages.receiverId, userId), eq(messages.read, false)))
  const channelUnread = classIds.length
    ? await db
        .select({ count: count() })
        .from(channelMessages)
        .innerJoin(classChannels, eq(channelMessages.channelId, classChannels.id))
        .where(
          and(
            inArray(classChannels.classId, classIds),
            sql`${channelMessages.senderId} != ${userId}`,
            sql`${channelMessages.readBy} NOT LIKE ${`%"${userId}"%`}`,
          ),
        )
    : [{ count: 0 }]
  const unreadQuestions = (directUnread[0]?.count ?? 0) + (channelUnread[0]?.count ?? 0)

  const gradedThisWeek = classIds.length
    ? await db
        .select({ count: count() })
        .from(submissions)
        .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
        .where(
          and(
            inArray(classwork.classId, classIds),
            eq(submissions.status, "graded"),
            gte(submissions.gradedAt, PULSE_DAYS_AGO()),
          ),
        )
    : [{ count: 0 }]

  const lowParticipation = classIds.length
    ? await db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count
      FROM class_membership cm
      WHERE cm.class_id IN (${sql.join(classIds.map((entry) => sql`${entry}`), sql`, `)})
        AND cm.role = 'student'
        AND NOT EXISTS (
          SELECT 1 FROM submissions s
          INNER JOIN classwork cw ON cw.id = s.classwork_id
          WHERE s.student_id = cm.user_id
            AND cw.class_id = cm.class_id
            AND s.updated_at >= NOW() - INTERVAL '7 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM channel_messages chm
          INNER JOIN class_channels cc ON cc.id = chm.channel_id
          WHERE chm.sender_id = cm.user_id
            AND cc.class_id = cm.class_id
            AND chm.created_at >= NOW() - INTERVAL '7 days'
        )
    `)
    : [{ count: 0 }]

  const upcoming = classIds.length
    ? await db
        .select({ count: count() })
        .from(classwork)
        .where(
          and(
            inArray(classwork.classId, classIds),
            isNotNull(classwork.dueDate),
            gte(classwork.dueDate, sql`NOW()`),
            lt(classwork.dueDate, PULSE_DEADLINE_END()),
          ),
        )
    : [{ count: 0 }]

  const facts: PulseFact[] = []
  const review = reviewQueue[0]?.count ?? 0
  const overdueCount = Array.from(overdue)[0]?.count ?? 0
  const graded = gradedThisWeek[0]?.count ?? 0
  const lowCount = Array.from(lowParticipation)[0]?.count ?? 0
  const upcomingCount = upcoming[0]?.count ?? 0

  if (review > 0)
    facts.push({
      id: "to_review",
      label: "Submissions to review",
      value: review,
      detail: "Ready for grading right now",
      href: "/classes",
    })
  if (overdueCount > 0)
    facts.push({ id: "overdue", label: "Overdue submissions", value: overdueCount, detail: "Past due and unsubmitted" })
  if (unreadQuestions > 0)
    facts.push({ id: "unread_questions", label: "Unread student questions", value: unreadQuestions })
  if (upcomingCount > 0)
    facts.push({ id: "upcoming", label: "Assignments due this week", value: upcomingCount })
  if (graded > 0)
    facts.push({ id: "graded_week", label: "Graded this week", value: graded })
  if (lowCount > 0)
    facts.push({ id: "low_participation", label: "Students to check in", value: lowCount, detail: "No activity in 7 days" })

  return {
    role: "teacher",
    generatedAt: new Date().toISOString(),
    facts,
    nearestDeadline: await getNearestDeadline(classIds),
  }
}

async function getStudentFacts(classIds: string[], userId: string): Promise<PulseFacts> {
  const dueSoon = classIds.length
    ? await db
        .select({ count: count() })
        .from(classwork)
        .where(
          and(
            inArray(classwork.classId, classIds),
            isNotNull(classwork.dueDate),
            gte(classwork.dueDate, sql`NOW()`),
            lt(classwork.dueDate, PULSE_DEADLINE_END()),
            sql`NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.classwork_id = classwork.id AND s.student_id = ${userId}
            )`,
          ),
        )
    : [{ count: 0 }]

  const upcoming = classIds.length
    ? await db
        .select({ count: count() })
        .from(classwork)
        .where(
          and(
            inArray(classwork.classId, classIds),
            isNotNull(classwork.dueDate),
            gte(classwork.dueDate, sql`NOW()`),
            lt(classwork.dueDate, PULSE_DEADLINE_END()),
          ),
        )
    : [{ count: 0 }]

  const gradedThisWeek = classIds.length
    ? await db
        .select({ count: count() })
        .from(submissions)
        .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
        .where(
          and(
            inArray(classwork.classId, classIds),
            eq(submissions.studentId, userId),
            eq(submissions.status, "graded"),
            gte(submissions.gradedAt, PULSE_DAYS_AGO()),
          ),
        )
    : [{ count: 0 }]

  const unreadMessages = await db
    .select({ count: count() })
    .from(messages)
    .where(and(eq(messages.receiverId, userId), eq(messages.read, false)))

  const facts: PulseFact[] = []
  const dueSoonCount = dueSoon[0]?.count ?? 0
  const upcomingCount = upcoming[0]?.count ?? 0
  const graded = gradedThisWeek[0]?.count ?? 0
  const unread = unreadMessages[0]?.count ?? 0

  if (dueSoonCount > 0)
    facts.push({ id: "due_soon", label: "Assignments due this week", value: dueSoonCount, detail: "Not submitted yet" })
  if (upcomingCount > 0)
    facts.push({ id: "upcoming", label: "Upcoming assignments", value: upcomingCount })
  if (graded > 0)
    facts.push({ id: "graded_week", label: "Graded this week", value: graded })
  if (unread > 0)
    facts.push({ id: "unread", label: "Unread messages", value: unread })

  return {
    role: "student",
    generatedAt: new Date().toISOString(),
    facts,
    nearestDeadline: await getNearestDeadline(classIds),
  }
}

async function getNearestDeadline(classIds: string[]): Promise<PulseFacts["nearestDeadline"]> {
  if (classIds.length === 0) return null
  const [row] = await db
    .select({
      title: classwork.title,
      className: classes.title,
      dueDate: classwork.dueDate,
      classId: classes.id,
    })
    .from(classwork)
    .innerJoin(classes, eq(classwork.classId, classes.id))
    .where(and(inArray(classwork.classId, classIds), isNotNull(classwork.dueDate), gte(classwork.dueDate, sql`NOW()`)))
    .orderBy(classwork.dueDate)
    .limit(1)
  if (!row?.dueDate) return null
  return {
    title: row.title,
    className: row.className,
    classId: row.classId,
    dueDate: row.dueDate.toISOString(),
  }
}

/**
 * Resolve the user's role-specific class scope and build the pulse facts.
 * Results are cached for PULSE_FACTS_TTL_SECONDS keyed by user id.
 */
export async function getPulseFacts(params: {
  userId: string
  orgId: string
  role: "teacher" | "student"
}): Promise<PulseFacts> {
  const cacheKey = `pulse:facts:${params.userId}`
  const cached = await cacheGetJson<PulseFacts>(cacheKey)
  if (cached && cached.facts && Array.isArray(cached.facts)) {
    return cached
  }

  const classIds = await db
    .select({ id: classes.id })
    .from(classes)
    .leftJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(
      and(
        eq(classes.orgId, params.orgId),
        params.role === "teacher"
          ? eq(classes.ownerId, params.userId)
          : or(eq(classes.ownerId, params.userId), eq(classMembership.userId, params.userId)),
      ),
    )
    .groupBy(classes.id)
    .then((rows) => rows.map((row) => row.id))

  const facts =
    params.role === "teacher"
      ? await getTeacherFacts(classIds, params.userId)
      : await getStudentFacts(classIds, params.userId)

  void cacheSet(cacheKey, JSON.stringify(facts), PULSE_FACTS_TTL_SECONDS).catch(() => {})
  return facts
}