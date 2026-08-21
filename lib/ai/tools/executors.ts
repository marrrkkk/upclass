/**
 * Read-tool executors: org/class-scoped Drizzle queries.
 *
 * Every executor:
 * - scopes by `orgId` (classes, classwork, quizzes, announcements, channels),
 * - verifies class membership (or owner/teacher) for class-scoped data,
 * - is role-aware (students see only their own submissions/attempts and
 *   email-free rosters; teachers/owners see everything),
 * - never throws — errors become "Error: …" strings,
 * - clamps limits and truncates via the tool truncator.
 */
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm"
import { format } from "date-fns"

import { db } from "@/db"
import {
  activityLog,
  announcements,
  channelMessages,
  classChannels,
  classes,
  classMembership,
  classwork,
  orgMembership,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
  resources,
  submissions,
  user,
} from "@/db/schema"
import { retrieveMemories } from "@/lib/ai/memory/rag-retriever"
import { truncateToolOutput } from "@/lib/ai/tool-truncator"
import type { AiSourceRef, AiToolExecutionContext } from "@/lib/ai/types"

export type ExecutorOutput = { text: string; structured?: unknown; sourceRefs?: AiSourceRef[] }

function fmt(date: Date | null | undefined): string {
  if (!date) return ""
  return format(date, "MMM d, yyyy")
}

function clampLimit(limit: number | null | undefined, fallback = 10): number {
  const parsed = limit ?? fallback
  return Math.min(25, Math.max(1, parsed))
}

function errorText(message: string): ExecutorOutput {
  return { text: `Error: ${message}` }
}

function classUrl(orgSlug: string, classId: string): string {
  return `/${orgSlug}/classes/${classId}`
}

function resourceUrl(orgSlug: string, resourceId: string): string {
  return `/${orgSlug}/resources/${resourceId}`
}

export async function getClassAccess(
  ctx: AiToolExecutionContext,
  classId: string,
): Promise<"owner" | "teacher" | "student" | "none"> {
  const [classRow] = await db
    .select({
      id: classes.id,
      orgId: classes.orgId,
      ownerId: classes.ownerId,
      title: classes.title,
    })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1)

  if (!classRow || classRow.orgId !== ctx.orgId) return "none"

  if (classRow.ownerId === ctx.userId) return "owner"

  const [membership] = await db
    .select({ role: classMembership.role })
    .from(classMembership)
    .where(and(eq(classMembership.classId, classId), eq(classMembership.userId, ctx.userId)))
    .limit(1)

  return membership?.role ?? "none"
}

/** Classes the user can see (member or owner) within the org. */
async function getVisibleClassIds(ctx: AiToolExecutionContext): Promise<string[]> {
  const rows = await db
    .select({ id: classes.id })
    .from(classes)
    .leftJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(
      and(
        eq(classes.orgId, ctx.orgId),
        or(eq(classes.ownerId, ctx.userId), eq(classMembership.userId, ctx.userId)),
      ),
    )
    .groupBy(classes.id)
  return rows.map((row) => row.id)
}

/* -------------------------------------------------------------------------- */
/* Org-wide                                                                   */
/* -------------------------------------------------------------------------- */

export async function getOrgStatsExecutor(
  ctx: AiToolExecutionContext,
): Promise<ExecutorOutput> {
  try {
    const [classCount, memberCount, classworkCount, quizCount, announcementCount, resourceCount] =
      await Promise.all([
        db.select({ total: sql<number>`COUNT(*)::int`.as("total") }).from(classes).where(eq(classes.orgId, ctx.orgId)),
        db.select({ total: sql<number>`COUNT(*)::int`.as("total") }).from(orgMembership).where(eq(orgMembership.orgId, ctx.orgId)),
        db.select({ total: sql<number>`COUNT(*)::int`.as("total") }).from(classwork).innerJoin(classes, eq(classwork.classId, classes.id)).where(eq(classes.orgId, ctx.orgId)),
        db.select({ total: sql<number>`COUNT(*)::int`.as("total") }).from(quizzes).innerJoin(classes, eq(quizzes.classId, classes.id)).where(eq(classes.orgId, ctx.orgId)),
        db.select({ total: sql<number>`COUNT(*)::int`.as("total") }).from(announcements).innerJoin(classes, eq(announcements.classId, classes.id)).where(eq(classes.orgId, ctx.orgId)),
        db.select({ total: sql<number>`COUNT(*)::int`.as("total") }).from(resources).where(eq(resources.ownerId, ctx.userId)),
      ])

    const text = [
      `Organization stats:`,
      `- Classes: ${classCount[0]?.total ?? 0}`,
      `- Members: ${memberCount[0]?.total ?? 0}`,
      `- Classwork items: ${classworkCount[0]?.total ?? 0}`,
      `- Quizzes: ${quizCount[0]?.total ?? 0}`,
      `- Announcements: ${announcementCount[0]?.total ?? 0}`,
      `- Your uploaded resources: ${resourceCount[0]?.total ?? 0}`,
    ].join("\n")

    return { text }
  } catch (error) {
    console.error("[ai-tools] get_org_stats failed:", error)
    return errorText("Could not load organization stats. Try a different approach.")
  }
}

export async function getRecentActivityExecutor(
  ctx: AiToolExecutionContext,
  input: { limit?: number },
): Promise<ExecutorOutput> {
  try {
    const limit = clampLimit(input.limit, 10)
    const rows = await db
      .select({
        id: activityLog.id,
        title: activityLog.title,
        description: activityLog.description,
        eventType: activityLog.eventType,
        className: classes.title,
        classId: activityLog.classId,
        occurredAt: activityLog.occurredAt,
      })
      .from(activityLog)
      .innerJoin(classes, eq(activityLog.classId, classes.id))
      .where(eq(classes.orgId, ctx.orgId))
      .orderBy(desc(activityLog.occurredAt))
      .limit(limit)

    if (rows.length === 0) {
      return { text: "No recent activity found for this organization." }
    }

    const text = rows
      .map(
        (row) =>
          `- ${fmt(row.occurredAt)}: ${row.title}${row.className ? ` (${row.className})` : ""}${row.description ? ` — ${row.description}` : ""}`,
      )
      .join("\n")
    return { text }
  } catch (error) {
    console.error("[ai-tools] get_recent_activity failed:", error)
    return errorText("Could not load recent activity. Try a different approach.")
  }
}

/* -------------------------------------------------------------------------- */
/* Classes                                                                    */
/* -------------------------------------------------------------------------- */

export async function searchClassesExecutor(
  ctx: AiToolExecutionContext,
  input: { query: string; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const limit = clampLimit(input.limit, 10)
    const visibleIds = await getVisibleClassIds(ctx)
    if (visibleIds.length === 0) return { text: "No classes found." }

    const pattern = `%${input.query.trim()}%`
    const rows = await db
      .select({ id: classes.id, title: classes.title, code: classes.code, category: classes.category })
      .from(classes)
      .where(
        and(
          eq(classes.orgId, ctx.orgId),
          inArray(classes.id, visibleIds),
          or(ilike(classes.title, pattern), ilike(classes.code, pattern), ilike(classes.category, pattern)),
        ),
      )
      .orderBy(asc(classes.title))
      .limit(limit)

    if (rows.length === 0) return { text: `No classes match "${input.query}".` }

    const text = rows
      .map((row) => `- ${row.title} (code ${row.code}, ${row.category ?? "General"})`)
      .join("\n")
    return { text }
  } catch (error) {
    console.error("[ai-tools] search_classes failed:", error)
    return errorText("Could not search classes. Try a different approach.")
  }
}

export async function listClassesExecutor(
  ctx: AiToolExecutionContext,
  input: { limit?: number },
): Promise<ExecutorOutput> {
  try {
    const limit = clampLimit(input.limit, 10)
    const visibleIds = await getVisibleClassIds(ctx)
    if (visibleIds.length === 0) {
      return { text: "You are not a member of any classes yet." }
    }

    const rows = await db
      .select({
        id: classes.id,
        title: classes.title,
        description: classes.description,
        category: classes.category,
        code: classes.code,
        color: classes.color,
        schedule: classes.schedule,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(and(eq(classes.orgId, ctx.orgId), inArray(classes.id, visibleIds)))
      .orderBy(asc(classes.title))
      .limit(limit)

    if (rows.length === 0) {
      return { text: "You are not a member of any classes yet." }
    }

    const structured = {
      _type: "classes_list",
      title: "Your classes",
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        code: row.code,
        color: row.color,
        schedule: row.schedule,
        createdAt: fmt(row.createdAt),
        url: classUrl(ctx.orgSlug, row.id),
      })),
    }

    const sourceRefs: AiSourceRef[] = rows.map((row) => ({
      kind: "class",
      id: row.id,
      label: row.title,
      href: classUrl(ctx.orgSlug, row.id),
    }))

    const text = rows.map((row) => `- ${row.title} (code ${row.code})`).join("\n")
    return { text, structured, sourceRefs }
  } catch (error) {
    console.error("[ai-tools] list_classes failed:", error)
    return errorText("Could not list classes. Try a different approach.")
  }
}

export async function getClassDetailsExecutor(
  ctx: AiToolExecutionContext,
  input: { classId: string },
): Promise<ExecutorOutput> {
  try {
    const access = await getClassAccess(ctx, input.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const [classRow] = await db
      .select({
        id: classes.id,
        title: classes.title,
        description: classes.description,
        category: classes.category,
        code: classes.code,
        color: classes.color,
        schedule: classes.schedule,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(eq(classes.id, input.classId))
      .limit(1)

    if (!classRow) return errorText("Class not found.")

    const [memberCountRow] = await db
      .select({ total: sql<number>`COUNT(*)::int`.as("total") })
      .from(classMembership)
      .where(eq(classMembership.classId, input.classId))

    const teachers = await db
      .select({ id: user.id, name: user.name })
      .from(classMembership)
      .innerJoin(user, eq(classMembership.userId, user.id))
      .where(and(eq(classMembership.classId, input.classId), eq(classMembership.role, "teacher")))
      .limit(5)

    const teacherNames = teachers.length > 0 ? teachers.map((t) => t.name).join(", ") : "Owner"

    const structured = {
      _type: "class_details",
      title: classRow.title,
      items: [
        {
          id: classRow.id,
          title: classRow.title,
          description: classRow.description,
          category: classRow.category,
          code: classRow.code,
          color: classRow.color,
          schedule: classRow.schedule,
          memberCount: memberCountRow?.total ?? 0,
          teachers: teacherNames,
          createdAt: fmt(classRow.createdAt),
          url: classUrl(ctx.orgSlug, classRow.id),
        },
      ],
    }

    const text = [
      `${classRow.title} (${classRow.code})`,
      `- Category: ${classRow.category ?? "General"}`,
      `- Description: ${classRow.description ?? "No description"}`,
      `- Schedule: ${classRow.schedule ?? "No schedule set"}`,
      `- Members: ${memberCountRow?.total ?? 0}`,
      `- Teachers: ${teacherNames}`,
    ].join("\n")

    const sourceRefs: AiSourceRef[] = [
      {
        kind: "class",
        id: classRow.id,
        label: classRow.title,
        href: classUrl(ctx.orgSlug, classRow.id),
      },
    ]

    return { text, structured, sourceRefs }
  } catch (error) {
    console.error("[ai-tools] get_class_details failed:", error)
    return errorText("Could not load class details. Try a different approach.")
  }
}

export async function getClassRosterExecutor(
  ctx: AiToolExecutionContext,
  input: { classId: string; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const access = await getClassAccess(ctx, input.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const limit = clampLimit(input.limit, 20)
    const rows = await db
      .select({ id: user.id, name: user.name, email: user.email, role: classMembership.role, createdAt: classMembership.createdAt })
      .from(classMembership)
      .innerJoin(user, eq(classMembership.userId, user.id))
      .where(eq(classMembership.classId, input.classId))
      .orderBy(asc(classMembership.role), asc(user.name))
      .limit(limit)

    if (rows.length === 0) return { text: "This class has no members yet." }

    const isTeacher = access === "owner" || access === "teacher"
    const text = rows
      .map((row) => {
        const emailPart = isTeacher ? ` (${row.email})` : ""
        return `- ${row.name}${emailPart} — ${row.role}${row.createdAt ? `, joined ${fmt(row.createdAt)}` : ""}`
      })
      .join("\n")

    return { text }
  } catch (error) {
    console.error("[ai-tools] get_class_roster failed:", error)
    return errorText("Could not load the class roster. Try a different approach.")
  }
}

export async function getClassScheduleExecutor(
  ctx: AiToolExecutionContext,
  input: { classId: string },
): Promise<ExecutorOutput> {
  try {
    const access = await getClassAccess(ctx, input.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const [classRow] = await db
      .select({ title: classes.title, schedule: classes.schedule })
      .from(classes)
      .where(eq(classes.id, input.classId))
      .limit(1)

    if (!classRow) return errorText("Class not found.")
    return { text: `Schedule for ${classRow.title}: ${classRow.schedule ?? "No schedule set."}` }
  } catch (error) {
    console.error("[ai-tools] get_class_schedule failed:", error)
    return errorText("Could not load the class schedule. Try a different approach.")
  }
}

/* -------------------------------------------------------------------------- */
/* Classwork + submissions                                                    */
/* -------------------------------------------------------------------------- */

export async function listClassworkExecutor(
  ctx: AiToolExecutionContext,
  input: { classId: string; type?: "assignment" | "quiz" | "material"; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const access = await getClassAccess(ctx, input.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const limit = clampLimit(input.limit, 10)
    const conditions = [eq(classwork.classId, input.classId)]
    if (input.type) conditions.push(eq(classwork.type, input.type))

    const rows = await db
      .select({
        id: classwork.id,
        title: classwork.title,
        description: classwork.description,
        type: classwork.type,
        dueDate: classwork.dueDate,
        points: classwork.points,
        createdAt: classwork.createdAt,
      })
      .from(classwork)
      .where(and(...conditions))
      .orderBy(desc(classwork.createdAt))
      .limit(limit)

    if (rows.length === 0) {
      return { text: `No ${input.type ?? "classwork"} found in this class.` }
    }

    const structured = {
      _type: "classwork_list",
      title: "Classwork",
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        dueDate: fmt(row.dueDate),
        points: row.points,
        createdAt: fmt(row.createdAt),
        url: `${classUrl(ctx.orgSlug, input.classId)}#classwork`,
      })),
    }

    const sourceRefs: AiSourceRef[] = rows.map((row) => ({
      kind: "classwork",
      id: row.id,
      label: row.title,
      href: `${classUrl(ctx.orgSlug, input.classId)}#classwork`,
    }))

    const text = rows
      .map((row) => `- ${row.title} (${row.type})${row.dueDate ? `, due ${fmt(row.dueDate)}` : ""}${row.points ? `, ${row.points} pts` : ""}`)
      .join("\n")

    return { text, structured, sourceRefs }
  } catch (error) {
    console.error("[ai-tools] list_classwork failed:", error)
    return errorText("Could not load classwork. Try a different approach.")
  }
}

export async function getClassworkDetailsExecutor(
  ctx: AiToolExecutionContext,
  input: { classworkId: string },
): Promise<ExecutorOutput> {
  try {
    const [item] = await db
      .select({
        id: classwork.id,
        classId: classwork.classId,
        title: classwork.title,
        description: classwork.description,
        type: classwork.type,
        dueDate: classwork.dueDate,
        points: classwork.points,
        createdAt: classwork.createdAt,
      })
      .from(classwork)
      .where(eq(classwork.id, input.classworkId))
      .limit(1)

    if (!item) return errorText("Classwork not found.")
    const access = await getClassAccess(ctx, item.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const isTeacher = access === "owner" || access === "teacher"

    let statusLine = ""
    if (isTeacher) {
      const [row] = await db
        .select({
          submitted: sql<number>`COUNT(*) FILTER (WHERE ${submissions.status} = 'submitted')::int`.as("submitted"),
          graded: sql<number>`COUNT(*) FILTER (WHERE ${submissions.status} = 'graded')::int`.as("graded"),
          pending: sql<number>`COUNT(*) FILTER (WHERE ${submissions.status} = 'pending')::int`.as("pending"),
        })
        .from(submissions)
        .where(eq(submissions.classworkId, input.classworkId))
      statusLine = `\n- Submissions: ${row?.submitted ?? 0} submitted, ${row?.graded ?? 0} graded, ${row?.pending ?? 0} pending`
    } else {
      const [own] = await db
        .select({ status: submissions.status, grade: submissions.grade })
        .from(submissions)
        .where(and(eq(submissions.classworkId, input.classworkId), eq(submissions.studentId, ctx.userId)))
        .limit(1)
      statusLine = own ? `\n- Your submission: ${own.status}${own.grade ? `, grade ${own.grade}` : ""}` : "\n- You have not submitted yet"
    }

    return {
      text: [
        `${item.title} (${item.type})`,
        `- Description: ${item.description ?? "No description"}`,
        `- Due: ${item.dueDate ? fmt(item.dueDate) : "No due date"}`,
        `- Points: ${item.points ?? "Not set"}`,
        statusLine,
      ].join("\n"),
    }
  } catch (error) {
    console.error("[ai-tools] get_classwork_details failed:", error)
    return errorText("Could not load classwork details. Try a different approach.")
  }
}

export async function getUngradedSubmissionsExecutor(
  ctx: AiToolExecutionContext,
  input: { classId?: string; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const limit = clampLimit(input.limit, 10)

    const classConditions = [eq(classes.orgId, ctx.orgId)]
    if (input.classId) classConditions.push(eq(classes.id, input.classId))

    // Only classes the user teaches (teacher role or owner).
    const teacherClassIds = await db
      .select({ id: classes.id })
      .from(classes)
      .leftJoin(classMembership, eq(classMembership.classId, classes.id))
      .where(
        and(
          ...classConditions,
          or(eq(classes.ownerId, ctx.userId), eq(classMembership.userId, ctx.userId)),
        ),
      )
      .groupBy(classes.id)
      .having(sql`MAX(CASE WHEN ${classMembership.role} = 'teacher' THEN 1 ELSE 0 END) = 1 OR MAX(CASE WHEN ${classes.ownerId} = ${ctx.userId} THEN 1 ELSE 0 END) = 1`)

    const ids = teacherClassIds.map((row) => row.id)
    if (ids.length === 0) {
      return { text: "No classes you teach have ungraded submissions." }
    }

    const rows = await db
      .select({
        id: submissions.id,
        classworkId: submissions.classworkId,
        classworkTitle: classwork.title,
        className: classes.title,
        studentName: user.name,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .innerJoin(classes, eq(classwork.classId, classes.id))
      .innerJoin(user, eq(submissions.studentId, user.id))
.where(
          and(
            inArray(classwork.classId, ids),
            eq(submissions.status, "submitted"),
            isNull(submissions.grade),
          ),
        )
      .orderBy(desc(submissions.submittedAt))
      .limit(limit)

    if (rows.length === 0) return { text: "No ungraded submissions right now." }

    const text = rows
      .map((row) => `- ${row.studentName} — ${row.classworkTitle} (${row.className}), submitted ${fmt(row.submittedAt)}`)
      .join("\n")
    return { text }
  } catch (error) {
    console.error("[ai-tools] get_ungraded_submissions failed:", error)
    return errorText("Could not load ungraded submissions. Try a different approach.")
  }
}

export async function getSubmissionDetailsExecutor(
  ctx: AiToolExecutionContext,
  input: { submissionId: string },
): Promise<ExecutorOutput> {
  try {
    const [row] = await db
      .select({
        id: submissions.id,
        classworkId: submissions.classworkId,
        classworkTitle: classwork.title,
        className: classes.title,
        classId: classes.id,
        studentId: submissions.studentId,
        studentName: user.name,
        content: submissions.content,
        status: submissions.status,
        grade: submissions.grade,
        feedback: submissions.feedback,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .innerJoin(classes, eq(classwork.classId, classes.id))
      .innerJoin(user, eq(submissions.studentId, user.id))
      .where(eq(submissions.id, input.submissionId))
      .limit(1)

    if (!row) return errorText("Submission not found.")
    const access = await getClassAccess(ctx, row.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const isTeacher = access === "owner" || access === "teacher"
    if (!isTeacher && row.studentId !== ctx.userId) {
      return errorText("You can only view your own submissions.")
    }

    return {
      text: [
        `Submission by ${row.studentName} for ${row.classworkTitle}`,
        `- Status: ${row.status}`,
        `- Grade: ${row.grade ?? "Not graded yet"}`,
        `- Feedback: ${row.feedback ?? "No feedback yet"}`,
        `- Submitted: ${row.submittedAt ? fmt(row.submittedAt) : "Not submitted"}`,
        `- Content: ${(row.content ?? "No text content").slice(0, 1000)}`,
      ].join("\n"),
    }
  } catch (error) {
    console.error("[ai-tools] get_submission_details failed:", error)
    return errorText("Could not load the submission. Try a different approach.")
  }
}

/* -------------------------------------------------------------------------- */
/* Quizzes                                                                    */
/* -------------------------------------------------------------------------- */

export async function listQuizzesExecutor(
  ctx: AiToolExecutionContext,
  input: { classId: string; status?: "draft" | "published"; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const access = await getClassAccess(ctx, input.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const limit = clampLimit(input.limit, 10)
    const conditions = [eq(quizzes.classId, input.classId)]
    if (input.status) conditions.push(eq(quizzes.status, input.status))

    const rows = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        status: quizzes.status,
        dueDate: quizzes.dueDate,
        totalPoints: quizzes.totalPoints,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .where(and(...conditions))
      .orderBy(desc(quizzes.createdAt))
      .limit(limit)

    if (rows.length === 0) return { text: "No quizzes found in this class." }

    const structured = {
      _type: "quizzes_list",
      title: "Quizzes",
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        dueDate: fmt(row.dueDate),
        totalPoints: row.totalPoints,
        createdAt: fmt(row.createdAt),
        url: `${classUrl(ctx.orgSlug, input.classId)}/quizzes/${row.id}`,
      })),
    }

    const sourceRefs: AiSourceRef[] = rows.map((row) => ({
      kind: "quiz",
      id: row.id,
      label: row.title,
      href: `${classUrl(ctx.orgSlug, input.classId)}/quizzes/${row.id}`,
    }))

    const text = rows
      .map((row) => `- ${row.title} (${row.status})${row.dueDate ? `, due ${fmt(row.dueDate)}` : ""}${row.totalPoints ? `, ${row.totalPoints} pts` : ""}`)
      .join("\n")

    return { text, structured, sourceRefs }
  } catch (error) {
    console.error("[ai-tools] list_quizzes failed:", error)
    return errorText("Could not load quizzes. Try a different approach.")
  }
}

export async function getQuizDetailsExecutor(
  ctx: AiToolExecutionContext,
  input: { quizId: string },
): Promise<ExecutorOutput> {
  try {
    const [quiz] = await db
      .select({
        id: quizzes.id,
        classId: quizzes.classId,
        title: quizzes.title,
        description: quizzes.description,
        status: quizzes.status,
        dueDate: quizzes.dueDate,
        timeLimitSeconds: quizzes.timeLimitSeconds,
        totalPoints: quizzes.totalPoints,
      })
      .from(quizzes)
      .where(eq(quizzes.id, input.quizId))
      .limit(1)

    if (!quiz) return errorText("Quiz not found.")
    const access = await getClassAccess(ctx, quiz.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const isTeacher = access === "owner" || access === "teacher"

    const questions = await db
      .select({
        id: quizQuestions.id,
        prompt: quizQuestions.prompt,
        type: quizQuestions.type,
        points: quizQuestions.points,
        order: quizQuestions.order,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, input.quizId))
      .orderBy(asc(quizQuestions.order))

    const questionRows = await Promise.all(
      questions.map(async (question) => {
        const options = await db
          .select({ id: quizOptions.id, text: quizOptions.text, isCorrect: quizOptions.isCorrect })
          .from(quizOptions)
          .where(eq(quizOptions.questionId, question.id))
          .orderBy(asc(quizOptions.createdAt))
        return {
          id: question.id,
          prompt: question.prompt,
          type: question.type,
          points: question.points,
          options: options.map((option) =>
            isTeacher ? option : { id: option.id, text: option.text },
          ),
        }
      }),
    )

    const structured = {
      _type: "quiz_details",
      title: quiz.title,
      items: [
        {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          status: quiz.status,
          dueDate: fmt(quiz.dueDate),
          timeLimitSeconds: quiz.timeLimitSeconds,
          totalPoints: quiz.totalPoints,
          questionCount: questionRows.length,
          questions: questionRows,
          url: `${classUrl(ctx.orgSlug, quiz.classId)}/quizzes/${quiz.id}`,
        },
      ],
    }

    const text = [
      `${quiz.title} (${quiz.status})`,
      `- Description: ${quiz.description ?? "No description"}`,
      `- Due: ${quiz.dueDate ? fmt(quiz.dueDate) : "No due date"}`,
      `- Points: ${quiz.totalPoints ?? "Not set"}`,
      `- Questions: ${questionRows.length}`,
    ].join("\n")

    return { text, structured }
  } catch (error) {
    console.error("[ai-tools] get_quiz_details failed:", error)
    return errorText("Could not load the quiz. Try a different approach.")
  }
}

export async function getQuizResultsExecutor(
  ctx: AiToolExecutionContext,
  input: { quizId: string; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const [quiz] = await db
      .select({ id: quizzes.id, classId: quizzes.classId, title: quizzes.title })
      .from(quizzes)
      .where(eq(quizzes.id, input.quizId))
      .limit(1)

    if (!quiz) return errorText("Quiz not found.")
    const access = await getClassAccess(ctx, quiz.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const isTeacher = access === "owner" || access === "teacher"
    const limit = clampLimit(input.limit, 10)

    const conditions = [eq(quizAttempts.quizId, input.quizId)]
    if (!isTeacher) conditions.push(eq(quizAttempts.studentId, ctx.userId))

    const rows = await db
      .select({
        id: quizAttempts.id,
        studentId: quizAttempts.studentId,
        studentName: user.name,
        status: quizAttempts.status,
        score: quizAttempts.score,
        submittedAt: quizAttempts.submittedAt,
        timeSpentSeconds: quizAttempts.timeSpentSeconds,
      })
      .from(quizAttempts)
      .innerJoin(user, eq(quizAttempts.studentId, user.id))
      .where(and(...conditions))
      .orderBy(desc(quizAttempts.submittedAt))
      .limit(limit)

    if (rows.length === 0) {
      return { text: isTeacher ? "No attempts on this quiz yet." : "You have not attempted this quiz yet." }
    }

    const text = rows
      .map((row) => `- ${row.studentName}: ${row.score ?? "No score"}${row.submittedAt ? `, submitted ${fmt(row.submittedAt)}` : ""}`)
      .join("\n")

    return { text }
  } catch (error) {
    console.error("[ai-tools] get_quiz_results failed:", error)
    return errorText("Could not load quiz results. Try a different approach.")
  }
}

export async function getStudentOverviewExecutor(
  ctx: AiToolExecutionContext,
  input: { classId: string; studentId?: string },
): Promise<ExecutorOutput> {
  try {
    const access = await getClassAccess(ctx, input.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const isTeacher = access === "owner" || access === "teacher"
    const targetStudentId = isTeacher && input.studentId ? input.studentId : ctx.userId
    if (!isTeacher && input.studentId && input.studentId !== ctx.userId) {
      return errorText("You can only view your own overview.")
    }

    const [student] = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, targetStudentId))
      .limit(1)
    if (!student) return errorText("Student not found.")

    const [submissionCount, gradedCount, quizCount, avgScore] = await Promise.all([
      db
        .select({ total: sql<number>`COUNT(*)::int`.as("total") })
        .from(submissions)
        .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
        .where(and(eq(classwork.classId, input.classId), eq(submissions.studentId, targetStudentId))),
      db
        .select({ total: sql<number>`COUNT(*)::int`.as("total") })
        .from(submissions)
        .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
        .where(
          and(
            eq(classwork.classId, input.classId),
            eq(submissions.studentId, targetStudentId),
            or(eq(submissions.status, "graded"), isNotNull(submissions.grade)),
          ),
        ),
      db
        .select({ total: sql<number>`COUNT(*)::int`.as("total") })
        .from(quizAttempts)
        .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .where(and(eq(quizzes.classId, input.classId), eq(quizAttempts.studentId, targetStudentId))),
      db
        .select({ avg: sql<number>`AVG(NULLIF(${submissions.grade}, '')::numeric)::float`.as("avg") })
        .from(submissions)
        .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
        .where(
          and(eq(classwork.classId, input.classId), eq(submissions.studentId, targetStudentId)),
        ),
    ])

    const avgGrade = avgScore[0]?.avg

    const structured = {
      _type: "student_overview",
      title: `${student.name} — overview`,
      items: [
        {
          studentId: student.id,
          studentName: student.name,
          classId: input.classId,
          submissionCount: submissionCount[0]?.total ?? 0,
          gradedCount: gradedCount[0]?.total ?? 0,
          quizAttempts: quizCount[0]?.total ?? 0,
          averageGrade: avgGrade != null ? Number(avgGrade.toFixed(1)) : null,
        },
      ],
    }

    const text = [
      `Overview for ${student.name}:`,
      `- Submissions: ${submissionCount[0]?.total ?? 0} (${gradedCount[0]?.total ?? 0} graded)`,
      `- Quiz attempts: ${quizCount[0]?.total ?? 0}`,
      `- Average grade: ${avgGrade != null ? avgGrade.toFixed(1) : "No graded submissions yet"}`,
    ].join("\n")

    return { text, structured }
  } catch (error) {
    console.error("[ai-tools] get_student_overview failed:", error)
    return errorText("Could not load the student overview. Try a different approach.")
  }
}

/* -------------------------------------------------------------------------- */
/* Resources (user-scoped)                                                    */
/* -------------------------------------------------------------------------- */

export async function listResourcesExecutor(
  ctx: AiToolExecutionContext,
  input: { limit?: number },
): Promise<ExecutorOutput> {
  try {
    const limit = clampLimit(input.limit, 10)
    const rows = await db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        category: resources.category,
        fileType: resources.fileType,
        fileName: resources.fileName,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(eq(resources.ownerId, ctx.userId))
      .orderBy(desc(resources.createdAt))
      .limit(limit)

    if (rows.length === 0) return { text: "You have not uploaded any resources yet." }

    const structured = {
      _type: "resources_list",
      title: "Your resources",
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        fileType: row.fileType,
        fileName: row.fileName,
        createdAt: fmt(row.createdAt),
        url: resourceUrl(ctx.orgSlug, row.id),
      })),
    }

    const sourceRefs: AiSourceRef[] = rows.map((row) => ({
      kind: "resource",
      id: row.id,
      label: row.title,
      href: resourceUrl(ctx.orgSlug, row.id),
    }))

    const text = rows.map((row) => `- ${row.title} (${row.fileType})`).join("\n")
    return { text, structured, sourceRefs }
  } catch (error) {
    console.error("[ai-tools] list_resources failed:", error)
    return errorText("Could not list resources. Try a different approach.")
  }
}

export async function getResourceDetailsExecutor(
  ctx: AiToolExecutionContext,
  input: { resourceId: string },
): Promise<ExecutorOutput> {
  try {
    const [resource] = await db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        category: resources.category,
        fileType: resources.fileType,
        fileName: resources.fileName,
        aiSourceText: resources.aiSourceText,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(and(eq(resources.id, input.resourceId), eq(resources.ownerId, ctx.userId)))
      .limit(1)

    if (!resource) return errorText("Resource not found.")

    const preview = (resource.aiSourceText ?? "").slice(0, 4_000)
    const text = [
      `${resource.title} (${resource.fileType})`,
      `- Description: ${resource.description ?? "No description"}`,
      `- Category: ${resource.category ?? "General"}`,
      `- File: ${resource.fileName}`,
      preview ? `\nSource text preview:\n${preview}` : "",
    ].join("\n")

    return { text: truncateToolOutput(text, 6_000) }
  } catch (error) {
    console.error("[ai-tools] get_resource_details failed:", error)
    return errorText("Could not load the resource. Try a different approach.")
  }
}

export async function searchResourcesExecutor(
  ctx: AiToolExecutionContext,
  input: { query: string; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const limit = clampLimit(input.limit, 10)
    const pattern = `%${input.query.trim()}%`
    const rows = await db
      .select({
        id: resources.id,
        title: resources.title,
        category: resources.category,
        fileType: resources.fileType,
      })
      .from(resources)
      .where(
        and(
          eq(resources.ownerId, ctx.userId),
          or(ilike(resources.title, pattern), ilike(resources.description, pattern)),
        ),
      )
      .orderBy(desc(resources.createdAt))
      .limit(limit)

    if (rows.length === 0) return { text: `No resources match "${input.query}".` }

    const text = rows.map((row) => `- ${row.title} (${row.fileType})`).join("\n")
    return { text }
  } catch (error) {
    console.error("[ai-tools] search_resources failed:", error)
    return errorText("Could not search resources. Try a different approach.")
  }
}

/* -------------------------------------------------------------------------- */
/* Announcements + channels                                                   */
/* -------------------------------------------------------------------------- */

export async function getAnnouncementsExecutor(
  ctx: AiToolExecutionContext,
  input: { classId: string; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const access = await getClassAccess(ctx, input.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const limit = clampLimit(input.limit, 10)
    const rows = await db
      .select({
        id: announcements.id,
        content: announcements.content,
        authorName: user.name,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .innerJoin(user, eq(announcements.authorId, user.id))
      .where(eq(announcements.classId, input.classId))
      .orderBy(desc(announcements.createdAt))
      .limit(limit)

    if (rows.length === 0) return { text: "No announcements in this class yet." }

    const text = rows
      .map((row) => `- ${fmt(row.createdAt)} · ${row.authorName}: ${row.content.slice(0, 500)}`)
      .join("\n")

    return { text }
  } catch (error) {
    console.error("[ai-tools] get_announcements failed:", error)
    return errorText("Could not load announcements. Try a different approach.")
  }
}

export async function getChannelMessagesExecutor(
  ctx: AiToolExecutionContext,
  input: { channelId: string; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const [channel] = await db
      .select({
        id: classChannels.id,
        classId: classChannels.classId,
        name: classChannels.name,
        slug: classChannels.slug,
      })
      .from(classChannels)
      .where(eq(classChannels.id, input.channelId))
      .limit(1)

    if (!channel) return errorText("Channel not found.")
    const access = await getClassAccess(ctx, channel.classId)
    if (access === "none") return errorText("Class not found or you are not a member.")

    const limit = clampLimit(input.limit, 15)
    const rows = await db
      .select({
        id: channelMessages.id,
        content: channelMessages.content,
        senderName: user.name,
        createdAt: channelMessages.createdAt,
      })
      .from(channelMessages)
      .innerJoin(user, eq(channelMessages.senderId, user.id))
      .where(eq(channelMessages.channelId, input.channelId))
      .orderBy(desc(channelMessages.createdAt))
      .limit(limit)

    if (rows.length === 0) return { text: `No messages in #${channel.name} yet.` }

    const text = rows
      .reverse()
      .map((row) => `- ${fmt(row.createdAt)} · ${row.senderName}: ${row.content.slice(0, 500)}`)
      .join("\n")

    return { text }
  } catch (error) {
    console.error("[ai-tools] get_channel_messages failed:", error)
    return errorText("Could not load channel messages. Try a different approach.")
  }
}

/* -------------------------------------------------------------------------- */
/* Org knowledge                                                              */
/* -------------------------------------------------------------------------- */

export async function getOrgKnowledgeExecutor(
  ctx: AiToolExecutionContext,
  input: { query: string; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const { memories, usedRag } = await retrieveMemories({
      orgId: ctx.orgId,
      query: input.query,
      topK: input.limit ?? 5,
    })

    if (memories.length === 0) {
      return { text: "No knowledge base entries match that query." }
    }

    const text = memories
      .map(
        (memory) =>
          `[${memory.tier}] [${memory.category}] ${memory.title}\n${memory.content.slice(0, 1000)}`,
      )
      .join("\n\n")

    return { text: `${text}\n\n(retrieved from the org knowledge base${usedRag ? "" : " — without embedding search"})` }
  } catch (error) {
    console.error("[ai-tools] get_org_knowledge failed:", error)
    return errorText("Could not retrieve org knowledge. Try a different approach.")
  }
}

/* -------------------------------------------------------------------------- */
/* Unified search across content types                                        */
/* -------------------------------------------------------------------------- */

export async function unifiedSearchExecutor(
  ctx: AiToolExecutionContext,
  input: { query: string; types?: ("class" | "classwork" | "resource" | "announcement")[]; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const limit = clampLimit(input.limit, 25)
    const searchTypes = input.types ?? ["class", "classwork", "resource", "announcement"]
    const pattern = `%${input.query.trim()}%`
    const results: Array<{ type: string; title: string; description?: string; url: string }> = []

    // Search classes
    if (searchTypes.includes("class")) {
      const visibleIds = await getVisibleClassIds(ctx)
      if (visibleIds.length > 0) {
        const classRows = await db
          .select({ id: classes.id, title: classes.title, description: classes.description })
          .from(classes)
          .where(
            and(
              inArray(classes.id, visibleIds),
              or(ilike(classes.title, pattern), ilike(classes.description, pattern)),
            ),
          )
          .limit(Math.ceil(limit / searchTypes.length))
        
        for (const row of classRows) {
          results.push({
            type: "class",
            title: row.title,
            description: row.description ?? undefined,
            url: classUrl(ctx.orgSlug, row.id),
          })
        }
      }
    }

    // Search classwork
    if (searchTypes.includes("classwork")) {
      const visibleIds = await getVisibleClassIds(ctx)
      if (visibleIds.length > 0) {
        const classworkRows = await db
          .select({
            id: classwork.id,
            title: classwork.title,
            description: classwork.description,
            classId: classwork.classId,
            className: classes.title,
          })
          .from(classwork)
          .innerJoin(classes, eq(classwork.classId, classes.id))
          .where(
            and(
              inArray(classwork.classId, visibleIds),
              or(ilike(classwork.title, pattern), ilike(classwork.description, pattern)),
            ),
          )
          .limit(Math.ceil(limit / searchTypes.length))
        
        for (const row of classworkRows) {
          results.push({
            type: "classwork",
            title: `${row.title} (${row.className})`,
            description: row.description ?? undefined,
            url: `${classUrl(ctx.orgSlug, row.classId)}#classwork`,
          })
        }
      }
    }

    // Search resources
    if (searchTypes.includes("resource")) {
      const resourceRows = await db
        .select({
          id: resources.id,
          title: resources.title,
          description: resources.description,
        })
        .from(resources)
        .where(
          and(
            eq(resources.ownerId, ctx.userId),
            or(ilike(resources.title, pattern), ilike(resources.description, pattern)),
          ),
        )
        .limit(Math.ceil(limit / searchTypes.length))
      
      for (const row of resourceRows) {
        results.push({
          type: "resource",
          title: row.title,
          description: row.description ?? undefined,
          url: resourceUrl(ctx.orgSlug, row.id),
        })
      }
    }

    // Search announcements
    if (searchTypes.includes("announcement")) {
      const visibleIds = await getVisibleClassIds(ctx)
      if (visibleIds.length > 0) {
        const announcementRows = await db
          .select({
            id: announcements.id,
            content: announcements.content,
            classId: announcements.classId,
            className: classes.title,
          })
          .from(announcements)
          .innerJoin(classes, eq(announcements.classId, classes.id))
          .where(
            and(
              inArray(announcements.classId, visibleIds),
              ilike(announcements.content, pattern),
            ),
          )
          .limit(Math.ceil(limit / searchTypes.length))
        
        for (const row of announcementRows) {
          results.push({
            type: "announcement",
            title: `Announcement in ${row.className}`,
            description: row.content.slice(0, 100),
            url: classUrl(ctx.orgSlug, row.classId),
          })
        }
      }
    }

    if (results.length === 0) {
      return { text: `No results found for "${input.query}".` }
    }

    const text = results
      .slice(0, limit)
      .map((r) => `- [${r.type}] ${r.title}${r.description ? `: ${r.description}` : ""}`)
      .join("\n")
    
    return { text }
  } catch (error) {
    console.error("[ai-tools] unified_search failed:", error)
    return errorText("Could not search content. Try a different approach.")
  }
}

export async function searchResourceContentExecutor(
  ctx: AiToolExecutionContext,
  input: { resourceId: string; query: string },
): Promise<ExecutorOutput> {
  try {
    const [resource] = await db
      .select({ id: resources.id, title: resources.title, aiSourceText: resources.aiSourceText, ownerId: resources.ownerId })
      .from(resources)
      .where(eq(resources.id, input.resourceId))
      .limit(1)

    if (!resource) return errorText("Resource not found.")
    if (resource.ownerId !== ctx.userId) {
      // Check if shared via org
      const [shared] = await db
        .select({ id: resources.id })
        .from(resources)
        .innerJoin(orgMembership, eq(resources.ownerId, orgMembership.userId))
        .where(
          and(
            eq(resources.id, input.resourceId),
            eq(orgMembership.orgId, ctx.orgId),
          ),
        )
        .limit(1)
      
      if (!shared) return errorText("You do not have access to this resource.")
    }

    const sourceText = resource.aiSourceText ?? ""
    if (!sourceText) {
      return { text: "This resource has no extracted text content to search." }
    }

    const query = input.query.toLowerCase().trim()
    const lines = sourceText.split("\n")
    const matches: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.toLowerCase().includes(query)) {
        const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join("\n")
        matches.push(`...${context}...`)
        if (matches.length >= 5) break
      }
    }

    if (matches.length === 0) {
      return { text: `No matches found for "${input.query}" in this resource.` }
    }

    return {
      text: `Found ${matches.length} match${matches.length > 1 ? "es" : ""} for "${input.query}" in ${resource.title}:\n\n${matches.join("\n\n")}`,
    }
  } catch (error) {
    console.error("[ai-tools] search_resource_content failed:", error)
    return errorText("Could not search resource content. Try a different approach.")
  }
}

export async function getUpcomingWorkExecutor(
  ctx: AiToolExecutionContext,
  input: { classId?: string; days?: number; limit?: number },
): Promise<ExecutorOutput> {
  try {
    const days = Math.min(30, Math.max(1, input.days ?? 7))
    const limit = clampLimit(input.limit, 25)
    const now = new Date()
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const visibleIds = await getVisibleClassIds(ctx)
    if (visibleIds.length === 0) {
      return { text: "You are not a member of any classes yet." }
    }

    const conditions = [
      inArray(classwork.classId, visibleIds),
      isNotNull(classwork.dueDate),
      sql`${classwork.dueDate} <= ${futureDate}`,
    ]

    if (input.classId) {
      const access = await getClassAccess(ctx, input.classId)
      if (access === "none") return errorText("Class not found or you are not a member.")
      conditions.push(eq(classwork.classId, input.classId))
    }

    const rows = await db
      .select({
        id: classwork.id,
        title: classwork.title,
        type: classwork.type,
        dueDate: classwork.dueDate,
        points: classwork.points,
        className: classes.title,
        classId: classwork.classId,
      })
      .from(classwork)
      .innerJoin(classes, eq(classwork.classId, classes.id))
      .where(and(...conditions))
      .orderBy(asc(classwork.dueDate))
      .limit(limit)

    if (rows.length === 0) {
      return { text: `No work due in the next ${days} day${days > 1 ? "s" : ""}.` }
    }

    const overdue = rows.filter((r) => r.dueDate && r.dueDate < now)
    const upcoming = rows.filter((r) => r.dueDate && r.dueDate >= now)

    const parts: string[] = []
    
    if (overdue.length > 0) {
      parts.push(`⚠️ OVERDUE (${overdue.length}):`)
      parts.push(
        ...overdue.map(
          (r) =>
            `- ${r.title} (${r.type}) — ${r.className}, was due ${fmt(r.dueDate)}${r.points ? `, ${r.points} pts` : ""}`,
        ),
      )
    }

    if (upcoming.length > 0) {
      parts.push(`\n📅 Upcoming (${upcoming.length}):`)
      parts.push(
        ...upcoming.map(
          (r) =>
            `- ${r.title} (${r.type}) — ${r.className}, due ${fmt(r.dueDate)}${r.points ? `, ${r.points} pts` : ""}`,
        ),
      )
    }

    const structured = {
      _type: "upcoming_work",
      title: "Upcoming Work",
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        className: r.className,
        dueDate: fmt(r.dueDate),
        points: r.points,
        overdue: r.dueDate ? r.dueDate < now : false,
        url: `${classUrl(ctx.orgSlug, r.classId)}#classwork`,
      })),
    }

    return { text: parts.join("\n"), structured }
  } catch (error) {
    console.error("[ai-tools] get_upcoming_work failed:", error)
    return errorText("Could not load upcoming work. Try a different approach.")
  }
}

export async function getStudySummaryExecutor(
  ctx: AiToolExecutionContext,
  input: { classId?: string; focusAreas?: string[] },
): Promise<ExecutorOutput> {
  try {
    const visibleIds = await getVisibleClassIds(ctx)
    if (visibleIds.length === 0) {
      return { text: "You are not a member of any classes yet." }
    }

    const classConditions = [inArray(classes.id, visibleIds)]
    if (input.classId) {
      const access = await getClassAccess(ctx, input.classId)
      if (access === "none") return errorText("Class not found or you are not a member.")
      classConditions.push(eq(classes.id, input.classId))
    }

    const targetClasses = await db
      .select({ id: classes.id, title: classes.title })
      .from(classes)
      .where(and(...classConditions))
      .limit(10)

    if (targetClasses.length === 0) {
      return { text: "No classes found." }
    }

    const summaries: string[] = []

    for (const cls of targetClasses) {
      const [upcomingCount] = await db
        .select({ total: sql<number>`COUNT(*)::int`.as("total") })
        .from(classwork)
        .where(
          and(
            eq(classwork.classId, cls.id),
            isNotNull(classwork.dueDate),
            sql`${classwork.dueDate} > NOW()`,
          ),
        )

      const [recentAnnouncements] = await db
        .select({ total: sql<number>`COUNT(*)::int`.as("total") })
        .from(announcements)
        .where(
          and(
            eq(announcements.classId, cls.id),
            sql`${announcements.createdAt} > NOW() - INTERVAL '7 days'`,
          ),
        )

      summaries.push(
        `${cls.title}: ${upcomingCount?.total ?? 0} upcoming item${(upcomingCount?.total ?? 0) !== 1 ? "s" : ""}, ${recentAnnouncements?.total ?? 0} recent announcement${(recentAnnouncements?.total ?? 0) !== 1 ? "s" : ""}`,
      )
    }

    const focusNote = input.focusAreas && input.focusAreas.length > 0
      ? `\n\nFocus areas: ${input.focusAreas.join(", ")}`
      : ""

    return {
      text: `Study Summary:\n\n${summaries.join("\n")}${focusNote}`,
    }
  } catch (error) {
    console.error("[ai-tools] get_study_summary failed:", error)
    return errorText("Could not generate study summary. Try a different approach.")
  }
}

export async function getRecentContextExecutor(
  ctx: AiToolExecutionContext,
  input: { classId?: string; hours?: number },
): Promise<ExecutorOutput> {
  try {
    const hours = Math.min(168, Math.max(1, input.hours ?? 24))
    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000)

    const visibleIds = await getVisibleClassIds(ctx)
    if (visibleIds.length === 0) {
      return { text: "You are not a member of any classes yet." }
    }

    const classConditions = [inArray(classes.id, visibleIds)]
    if (input.classId) {
      const access = await getClassAccess(ctx, input.classId)
      if (access === "none") return errorText("Class not found or you are not a member.")
      classConditions.push(eq(classes.id, input.classId))
    }

    const targetClasses = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(...classConditions))

    const classIds = targetClasses.map((c) => c.id)
    if (classIds.length === 0) {
      return { text: "No classes found." }
    }

    // Recent announcements
    const recentAnnouncements = await db
      .select({
        content: announcements.content,
        className: classes.title,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .innerJoin(classes, eq(announcements.classId, classes.id))
      .where(
        and(
          inArray(announcements.classId, classIds),
          sql`${announcements.createdAt} > ${sinceDate}`,
        ),
      )
      .orderBy(desc(announcements.createdAt))
      .limit(5)

    // Recent classwork
    const recentClasswork = await db
      .select({
        title: classwork.title,
        type: classwork.type,
        className: classes.title,
        createdAt: classwork.createdAt,
      })
      .from(classwork)
      .innerJoin(classes, eq(classwork.classId, classes.id))
      .where(
        and(
          inArray(classwork.classId, classIds),
          sql`${classwork.createdAt} > ${sinceDate}`,
        ),
      )
      .orderBy(desc(classwork.createdAt))
      .limit(5)

    // Recent activity
    const recentActivity = await db
      .select({
        title: activityLog.title,
        description: activityLog.description,
        occurredAt: activityLog.occurredAt,
      })
      .from(activityLog)
      .where(
        and(
          inArray(activityLog.classId, classIds),
          sql`${activityLog.occurredAt} > ${sinceDate}`,
        ),
      )
      .orderBy(desc(activityLog.occurredAt))
      .limit(5)

    const parts: string[] = [`Recent context from the last ${hours} hour${hours > 1 ? "s" : ""}:`]

    if (recentAnnouncements.length > 0) {
      parts.push("\n📢 Announcements:")
      parts.push(
        ...recentAnnouncements.map(
          (a) => `- Announcement in ${a.className} — ${fmt(a.createdAt)}: ${a.content.slice(0, 60)}...`,
        ),
      )
    }

    if (recentClasswork.length > 0) {
      parts.push("\n📝 New Classwork:")
      parts.push(
        ...recentClasswork.map(
          (c) => `- ${c.title} (${c.type}) — ${c.className}, added ${fmt(c.createdAt)}`,
        ),
      )
    }

    if (recentActivity.length > 0) {
      parts.push("\n🔔 Activity:")
      parts.push(
        ...recentActivity.map((a) => `- ${a.title} — ${fmt(a.occurredAt)}`),
      )
    }

    if (
      recentAnnouncements.length === 0 &&
      recentClasswork.length === 0 &&
      recentActivity.length === 0
    ) {
      return { text: `No recent activity in the last ${hours} hour${hours > 1 ? "s" : ""}.` }
    }

    return { text: parts.join("\n") }
  } catch (error) {
    console.error("[ai-tools] get_recent_context failed:", error)
    return errorText("Could not load recent context. Try a different approach.")
  }
}

export const ALL_EXECUTORS: Record<
  string,
  (ctx: AiToolExecutionContext, input: never) => Promise<ExecutorOutput>
> = {
  get_org_stats: getOrgStatsExecutor,
  get_recent_activity: getRecentActivityExecutor,
  search_classes: searchClassesExecutor,
  list_classes: listClassesExecutor,
  get_class_details: getClassDetailsExecutor,
  get_class_roster: getClassRosterExecutor,
  get_class_schedule: getClassScheduleExecutor,
  list_classwork: listClassworkExecutor,
  get_classwork_details: getClassworkDetailsExecutor,
  get_ungraded_submissions: getUngradedSubmissionsExecutor,
  get_submission_details: getSubmissionDetailsExecutor,
  list_quizzes: listQuizzesExecutor,
  get_quiz_details: getQuizDetailsExecutor,
  get_quiz_results: getQuizResultsExecutor,
  get_student_overview: getStudentOverviewExecutor,
  list_resources: listResourcesExecutor,
  get_resource_details: getResourceDetailsExecutor,
  search_resources: searchResourcesExecutor,
  get_announcements: getAnnouncementsExecutor,
  get_channel_messages: getChannelMessagesExecutor,
  get_org_knowledge: getOrgKnowledgeExecutor,
  unified_search: unifiedSearchExecutor,
  search_resource_content: searchResourceContentExecutor,
  get_upcoming_work: getUpcomingWorkExecutor,
  get_study_summary: getStudySummaryExecutor,
  get_recent_context: getRecentContextExecutor,
}

export type ReadExecutorName = keyof typeof ALL_EXECUTORS