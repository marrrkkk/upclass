import { and, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm"
import {
  eachDayOfInterval,
  endOfDay,
  format,
  formatISO,
  isToday,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns"

import { db } from "@/db"
import { activityLog, classes } from "@/db/schema"
import {
  type ActivityCategory,
  type ActivityGraphDay,
  type ActivityLogItem,
  getActivityCategory,
  getActivityLevel,
} from "@/lib/activity-ui"

export type ActivityEventType =
  | "class_created"
  | "class_joined"
  | "announcement_created"
  | "assignment_created"
  | "material_created"
  | "quiz_created"
  | "resource_uploaded"
  | "assignment_submitted"
  | "quiz_submitted"
  | "submission_graded"
  | "quiz_graded"

type LogActivityInput = {
  actorId: string
  eventType: ActivityEventType
  entityType: string
  entityId: string
  classId?: string | null
  title: string
  description?: string | null
  metadata?: string | null
  occurredAt?: Date
}

type ActivityListOptions = {
  limit?: number
  category?: ActivityCategory
  cursor?: string | null
}

function isMissingActivitySchemaError(error: unknown) {
  const queue: unknown[] = [error]
  const visited = new Set<unknown>()

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue
    }

    visited.add(current)

    const candidate = current as {
      code?: string
      message?: string
      cause?: unknown
      digest?: string
    }

    if (
      candidate.code === "42P01" ||
      candidate.code === "42704" ||
      candidate.message?.includes('relation "activity_log" does not exist') === true ||
      candidate.message?.includes('type "activity_event_type" does not exist') === true ||
      candidate.message?.includes('type "activity_entity_type" does not exist') === true
    ) {
      return true
    }

    if (candidate.cause) {
      queue.push(candidate.cause)
    }
  }

  return false
}

function getActivityHref(item: {
  eventType: string
  classId: string | null
  entityId: string
}): string {
  if (item.eventType === "resource_uploaded") {
    return `/resources/${item.entityId}`
  }

  if (!item.classId) {
    return "/home"
  }

  if (item.eventType === "announcement_created") {
    return `/classes/${item.classId}#stream`
  }

  if (
    item.eventType === "assignment_created" ||
    item.eventType === "material_created" ||
    item.eventType === "assignment_submitted" ||
    item.eventType === "submission_graded"
  ) {
    return `/classes/${item.classId}#classwork`
  }

  if (
    item.eventType === "quiz_created" ||
    item.eventType === "quiz_submitted" ||
    item.eventType === "quiz_graded"
  ) {
    return `/classes/${item.classId}#quizzes`
  }

  return `/classes/${item.classId}`
}

function getCursorCondition(cursor?: string | null) {
  if (!cursor) return undefined

  const separatorIndex = cursor.lastIndexOf("__")
  if (separatorIndex === -1) return undefined

  const occurredAtValue = cursor.slice(0, separatorIndex)
  const idValue = cursor.slice(separatorIndex + 2)

  if (!occurredAtValue || !idValue) return undefined

  const occurredAt = new Date(occurredAtValue)
  if (Number.isNaN(occurredAt.getTime())) return undefined

  return or(
    lt(activityLog.occurredAt, occurredAt),
    and(eq(activityLog.occurredAt, occurredAt), lt(activityLog.id, idValue)),
  )
}

function getCategoryCondition(category: ActivityCategory) {
  if (category === "all") return undefined

  if (category === "classes") {
    return inArray(activityLog.eventType, ["class_created", "class_joined"])
  }

  if (category === "coursework") {
    return inArray(activityLog.eventType, ["assignment_submitted", "quiz_submitted"])
  }

  if (category === "resources") {
    return inArray(activityLog.eventType, ["resource_uploaded"])
  }

  return inArray(activityLog.eventType, [
    "announcement_created",
    "assignment_created",
    "material_created",
    "quiz_created",
    "submission_graded",
    "quiz_graded",
  ])
}

function mapActivityRow(row: {
  id: string
  eventType: string
  title: string
  description: string | null
  entityId: string
  classId: string | null
  occurredAt: Date
  className: string | null
}): ActivityLogItem {
  return {
    id: row.id,
    eventType: row.eventType,
    title: row.title,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    classId: row.classId,
    className: row.className,
    href: getActivityHref(row),
    category: getActivityCategory(row.eventType),
  }
}

export async function logActivity(input: LogActivityInput) {
  try {
    await db.insert(activityLog).values({
      id: crypto.randomUUID(),
      actorId: input.actorId,
      eventType: input.eventType as (typeof activityLog.$inferInsert)["eventType"],
      entityType: input.entityType as (typeof activityLog.$inferInsert)["entityType"],
      entityId: input.entityId,
      classId: input.classId ?? null,
      title: input.title,
      description: input.description ?? null,
      metadata: input.metadata ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    } satisfies typeof activityLog.$inferInsert)
  } catch (error) {
    if (isMissingActivitySchemaError(error)) {
      console.warn("Activity logging skipped because activity schema is not available yet.")
      return
    }

    throw error
  }
}

export async function getActivityGraphData(actorId: string, weeks = 18) {
  const today = new Date()
  const startDate = startOfWeek(subDays(today, weeks * 7 - 1), { weekStartsOn: 1 })
  const endDate = endOfDay(today)
  const allDays = eachDayOfInterval({ start: startDate, end: today })

  let countsByDate = new Map<string, number>()

  try {
    const rows = await db
      .select({
        occurredAt: activityLog.occurredAt,
      })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.actorId, actorId),
          gte(activityLog.occurredAt, startDate),
          lte(activityLog.occurredAt, endDate),
        ),
      )

    countsByDate = rows.reduce((map, row) => {
      const dateKey = format(row.occurredAt, "yyyy-MM-dd")
      map.set(dateKey, (map.get(dateKey) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  } catch (error) {
    if (!isMissingActivitySchemaError(error)) {
      throw error
    }
  }

  const days: ActivityGraphDay[] = allDays.map((day, index) => {
    const date = formatISO(day, { representation: "date" })
    const count = countsByDate.get(date) ?? 0

    return {
      date,
      count,
      level: getActivityLevel(count),
      weekday: (day.getDay() + 6) % 7,
      week: Math.floor(index / 7),
      isToday: isToday(day),
    }
  })

  return {
    days,
    total: days.reduce((sum, day) => sum + day.count, 0),
    startDate: formatISO(startDate, { representation: "date" }),
    endDate: formatISO(today, { representation: "date" }),
    weeks,
  }
}

export async function getActivityLog(actorId: string, options: ActivityListOptions = {}) {
  const limit = options.limit ?? 50
  const category = options.category ?? "all"

  let rows: Array<{
    id: string
    eventType: string
    title: string
    description: string | null
    entityId: string
    classId: string | null
    occurredAt: Date
    className: string | null
  }> = []

  try {
    rows = await db
      .select({
        id: activityLog.id,
        eventType: activityLog.eventType,
        title: activityLog.title,
        description: activityLog.description,
        entityId: activityLog.entityId,
        classId: activityLog.classId,
        occurredAt: activityLog.occurredAt,
        className: classes.title,
      })
      .from(activityLog)
      .leftJoin(classes, eq(activityLog.classId, classes.id))
      .where(
        and(
          eq(activityLog.actorId, actorId),
          getCategoryCondition(category),
          getCursorCondition(options.cursor),
        ),
      )
      .orderBy(desc(activityLog.occurredAt), desc(activityLog.id))
      .limit(limit + 1)
  } catch (error) {
    if (!isMissingActivitySchemaError(error)) {
      throw error
    }
  }

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  const items = pageRows.map(mapActivityRow)
  const lastRow = pageRows.at(-1)

  return {
    items,
    hasMore,
    nextCursor: hasMore && lastRow ? `${lastRow.occurredAt.toISOString()}__${lastRow.id}` : null,
  }
}

export async function getActivityRangeCount(actorId: string, category: ActivityCategory = "all", weeks = 18) {
  const startDate = startOfDay(subDays(new Date(), weeks * 7 - 1))

  try {
    const [result] = await db
      .select({
        count: sql<number>`COUNT(*)::int`.as("count"),
      })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.actorId, actorId),
          getCategoryCondition(category),
          gte(activityLog.occurredAt, startDate),
        ),
      )

    return Number(result?.count ?? 0)
  } catch (error) {
    if (isMissingActivitySchemaError(error)) {
      return 0
    }

    throw error
  }
}
