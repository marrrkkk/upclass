import { and, asc, count, desc, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm"

import { db } from "@/db"
import {
  announcementReactions,
  announcements,
  channelMessages,
  classChannels,
  classes,
  classMembership,
  classwork,
  gradingHistory,
  messages,
  notifications,
  quizAnswers,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
  resources,
  submissionAttachments,
  submissionRevisions,
  submissions,
  user,
} from "@/db/schema"
import { getActivityGraphData, getActivityLog } from "@/lib/activity"
import type { ActivityCategory } from "@/lib/activity-ui"
import { type ClassDetailTab } from "@/lib/classes/class-detail-tabs"
import { getChannelSummaries, getConversationSummaries } from "@/lib/server/messages"
import type { ClassData } from "@/types/classes"

export class MainRouteDataError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "MainRouteDataError"
    this.status = status
  }
}

type HomeClassItem = {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  color: string
  category?: string | null
  memberCount: number
  role: "teacher" | "student"
}

type SubmissionRow = {
  id: string
  classworkId: string
  studentId: string
  content: string | null
  fileUrl: string | null
  fileName: string | null
  status: (typeof submissions.$inferSelect)["status"]
  grade: string | null
  feedback: string | null
  submittedAt: Date | null
  gradedAt: Date | null
  attachments: Array<{
    id: string
    submissionId: string
    fileUrl: string
    fileName: string
    fileType: string | null
    fileSize: string | null
    storageBucket: string | null
    storagePath: string | null
    createdAt: Date
  }>
  revisions: Array<{
    id: string
    submissionId: string
    revisionNumber: number
    action: string
    content: string | null
    status: (typeof submissions.$inferSelect)["status"]
    submittedAt: Date | null
    createdAt: Date
  }>
  gradingHistory: Array<{
    id: string
    submissionId: string
    grade: string
    feedback: string | null
    createdAt: Date
  }>
  student: {
    id: string
    name: string
    image: string | null
  }
}

export async function getRecentClassesForUser(userId: string) {
  return db
    .select({
      id: classes.id,
      title: classes.title,
      color: classes.color,
    })
    .from(classes)
    .leftJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(or(eq(classes.ownerId, userId), eq(classMembership.userId, userId)))
    .groupBy(classes.id)
    .orderBy(desc(classes.updatedAt))
    .limit(6)
}

async function getUserClasses(userId: string) {
  const userClasses = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      thumbnail: classes.thumbnail,
      color: classes.color,
      category: classes.category,
      ownerId: classes.ownerId,
      memberCount: sql<number>`(
        SELECT COUNT(*) FROM class_membership
        WHERE class_membership.class_id = classes.id
      )`.as("member_count"),
    })
    .from(classes)
    .leftJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(or(eq(classes.ownerId, userId), eq(classMembership.userId, userId)))
    .groupBy(classes.id)
    .orderBy(desc(classes.updatedAt))
    .limit(50)

  return userClasses.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
    color: item.color || "#3b82f6",
    category: item.category,
    memberCount: Number(item.memberCount) || 0,
    role: (item.ownerId === userId ? "teacher" : "student") as "teacher" | "student",
  })) satisfies HomeClassItem[]
}

async function getTeacherAnalytics(userId: string, ownedClassIds: string[]) {
  const studentMemberships = await db
    .select({
      userId: user.id,
      studentName: user.name,
      classId: classes.id,
      className: classes.title,
    })
    .from(classMembership)
    .innerJoin(user, eq(classMembership.userId, user.id))
    .innerJoin(classes, eq(classMembership.classId, classes.id))
    .where(
      and(
        sql`${classMembership.classId} IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})`,
        eq(classMembership.role, "student"),
      ),
    )

  const studentIds = [...new Set(studentMemberships.map((membership) => membership.userId))]

  const overdueResult = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM classwork cw
    INNER JOIN class_membership cm
      ON cm.class_id = cw.class_id
      AND cm.role = 'student'
    LEFT JOIN submissions s
      ON s.classwork_id = cw.id
      AND s.student_id = cm.user_id
    WHERE cw.class_id IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})
      AND cw.type IN ('assignment', 'quiz')
      AND cw.due_date IS NOT NULL
      AND cw.due_date < NOW()
      AND (s.id IS NULL OR s.status NOT IN ('submitted', 'graded'))
  `)

  const reviewQueue = await db
    .select({
      submissionId: submissions.id,
      classId: classes.id,
      className: classes.title,
      classColor: classes.color,
      classworkTitle: classwork.title,
      studentName: user.name,
      submittedAt: submissions.submittedAt,
      attachmentCount: count(submissionAttachments.id),
    })
    .from(submissions)
    .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
    .innerJoin(classes, eq(classwork.classId, classes.id))
    .innerJoin(user, eq(submissions.studentId, user.id))
    .leftJoin(submissionAttachments, eq(submissionAttachments.submissionId, submissions.id))
    .where(
      and(
        sql`${classwork.classId} IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})`,
        eq(submissions.status, "submitted"),
      ),
    )
    .groupBy(submissions.id, classes.id, classwork.id, user.id)
    .orderBy(desc(submissions.submittedAt))
    .limit(8)

  const directUnreadQuestions = studentIds.length
    ? await db
        .select({ count: count() })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, userId),
            eq(messages.read, false),
            sql`${messages.senderId} IN (${sql.join(studentIds.map((entry) => sql`${entry}`), sql`, `)})`,
          ),
        )
    : [{ count: 0 }]

  const channelUnreadQuestions = await db
    .select({ count: count() })
    .from(channelMessages)
    .innerJoin(classChannels, eq(channelMessages.channelId, classChannels.id))
    .where(
      and(
        sql`${classChannels.classId} IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})`,
        sql`${channelMessages.senderId} != ${userId}`,
        sql`${channelMessages.readBy} NOT LIKE ${`%"${userId}"%`}`,
      ),
    )

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [submissionSummary, gradedSummary] = await Promise.all([
    db
      .select({ count: count() })
      .from(submissions)
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .where(
        and(
          sql`${classwork.classId} IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})`,
          gte(submissions.updatedAt, sevenDaysAgo),
        ),
      ),
    db
      .select({ count: count() })
      .from(submissions)
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .where(
        and(
          sql`${classwork.classId} IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})`,
          eq(submissions.status, "graded"),
          gte(submissions.gradedAt, sevenDaysAgo),
        ),
      ),
  ])

  const lowParticipationRows = ownedClassIds.length
    ? await db.execute<{
        userId: string
        studentName: string
        classId: string
        className: string
        latestActivityAt: Date | null
        latestSubmissionAt: Date | null
        latestMessageAt: Date | null
        latestChannelMessageAt: Date | null
      }>(sql`
        SELECT
          cm.user_id AS "userId",
          u.name AS "studentName",
          cm.class_id AS "classId",
          c.title AS "className",
          al.latest_activity_at AS "latestActivityAt",
          sub.latest_submission_at AS "latestSubmissionAt",
          dm.latest_message_at AS "latestMessageAt",
          ch.latest_channel_message_at AS "latestChannelMessageAt"
        FROM class_membership cm
        INNER JOIN "user" u ON u.id = cm.user_id
        INNER JOIN classes c ON c.id = cm.class_id
        LEFT JOIN (
          SELECT actor_id, class_id, MAX(occurred_at) AS latest_activity_at
          FROM activity_log
          WHERE class_id IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})
          GROUP BY actor_id, class_id
        ) al ON al.actor_id = cm.user_id AND al.class_id = cm.class_id
        LEFT JOIN (
          SELECT s.student_id, cw.class_id, MAX(s.updated_at) AS latest_submission_at
          FROM submissions s
          INNER JOIN classwork cw ON cw.id = s.classwork_id
          WHERE cw.class_id IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})
          GROUP BY s.student_id, cw.class_id
        ) sub ON sub.student_id = cm.user_id AND sub.class_id = cm.class_id
        LEFT JOIN (
          SELECT sender_id, MAX(created_at) AS latest_message_at
          FROM messages
          WHERE receiver_id = ${userId}
          GROUP BY sender_id
        ) dm ON dm.sender_id = cm.user_id
        LEFT JOIN (
          SELECT chm.sender_id, cc.class_id, MAX(chm.created_at) AS latest_channel_message_at
          FROM channel_messages chm
          INNER JOIN class_channels cc ON cc.id = chm.channel_id
          WHERE cc.class_id IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})
          GROUP BY chm.sender_id, cc.class_id
        ) ch ON ch.sender_id = cm.user_id AND ch.class_id = cm.class_id
        WHERE cm.class_id IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})
          AND cm.role = 'student'
      `)
    : []

  const lowParticipation = lowParticipationRows
    .map((member) => {
      const timestamps = [
        member.latestActivityAt,
        member.latestSubmissionAt,
        member.latestMessageAt,
        member.latestChannelMessageAt,
      ]
        .filter(Boolean)
        .map((value) => new Date(value as Date).getTime())

      const lastActiveAt = timestamps.length ? new Date(Math.max(...timestamps)) : null
      if (lastActiveAt && lastActiveAt >= sevenDaysAgo) {
        return null
      }

      return {
        userId: member.userId,
        studentName: member.studentName,
        classId: member.classId,
        className: member.className,
        lastActiveAt: lastActiveAt?.toISOString() ?? null,
      }
    })
    .filter(Boolean)
    .slice(0, 6) as Array<{
      userId: string
      studentName: string
      classId: string
      className: string
      lastActiveAt: string | null
    }>

  return {
    overdueCount: Array.from(overdueResult)[0]?.count || 0,
    unreadStudentQuestions:
      (directUnreadQuestions[0]?.count || 0) + (channelUnreadQuestions[0]?.count || 0),
    reviewQueue: reviewQueue.map((item) => ({
      ...item,
      classColor: item.classColor || "#3b82f6",
      submittedAt: item.submittedAt?.toISOString() ?? null,
      attachmentCount: Number(item.attachmentCount) || 0,
    })),
    lowParticipation,
    weeklySummary: {
      submissions: submissionSummary[0]?.count || 0,
      graded: gradedSummary[0]?.count || 0,
      unreadQuestions:
        (directUnreadQuestions[0]?.count || 0) + (channelUnreadQuestions[0]?.count || 0),
      overdue: Array.from(overdueResult)[0]?.count || 0,
    },
  }
}

export async function getHomeOverviewData(userId: string) {
  const [userData] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  const userRole = userData?.role ?? null
  const classesData = await getUserClasses(userId)
  const classIds = classesData.map((item) => item.id)

  const unreadMessagesPromise = db
    .select({ count: count() })
    .from(messages)
    .where(and(eq(messages.receiverId, userId), eq(messages.read, false)))

  const unreadNotificationsPromise = db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))

  const deadlinesPromise = classIds.length
    ? db
        .select({
          id: classwork.id,
          title: classwork.title,
          type: classwork.type,
          dueDate: classwork.dueDate,
          points: classwork.points,
          classId: classwork.classId,
          className: classes.title,
          classColor: classes.color,
        })
        .from(classwork)
        .innerJoin(classes, eq(classwork.classId, classes.id))
        .where(
          and(
            sql`${classwork.classId} IN (${sql.join(classIds.map((entry) => sql`${entry}`), sql`, `)})`,
            isNotNull(classwork.dueDate),
            gte(classwork.dueDate, sql`NOW() - INTERVAL '7 days'`),
          ),
        )
        .orderBy(classwork.dueDate)
        .limit(50)
    : Promise.resolve([])

  const submissionStatusPromise =
    userRole === "student"
      ? db
          .select({
            classworkId: submissions.classworkId,
            status: submissions.status,
          })
          .from(submissions)
          .where(eq(submissions.studentId, userId))
      : Promise.resolve([])

  const pendingTasksPromise =
    userRole === "student" && classIds.length
      ? db
          .select({ count: count() })
          .from(classwork)
          .leftJoin(
            submissions,
            and(eq(submissions.classworkId, classwork.id), eq(submissions.studentId, userId)),
          )
          .where(
            and(
              sql`${classwork.classId} IN (${sql.join(classIds.map((entry) => sql`${entry}`), sql`, `)})`,
              or(eq(classwork.type, "assignment"), eq(classwork.type, "quiz")),
              sql`${submissions.id} IS NULL`,
            ),
          )
      : Promise.resolve([])

  const ownedClassIds = classesData.filter((item) => item.role === "teacher").map((item) => item.id)
  const pendingSubmissionsPromise =
    userRole === "teacher" && ownedClassIds.length
      ? db
          .select({ count: count() })
          .from(submissions)
          .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
          .where(
            and(
              sql`${classwork.classId} IN (${sql.join(ownedClassIds.map((entry) => sql`${entry}`), sql`, `)})`,
              eq(submissions.status, "submitted"),
            ),
          )
      : Promise.resolve([])

  const teacherAnalyticsPromise =
    userRole === "teacher" && ownedClassIds.length
      ? getTeacherAnalytics(userId, ownedClassIds)
      : Promise.resolve(null)

  const [
    unreadMessagesResult,
    unreadNotificationsResult,
    upcomingClasswork,
    submissionStatus,
    pendingTasks,
    pendingSubmissions,
    teacherAnalytics,
  ] = await Promise.all([
    unreadMessagesPromise,
    unreadNotificationsPromise,
    deadlinesPromise,
    submissionStatusPromise,
    pendingTasksPromise,
    pendingSubmissionsPromise,
    teacherAnalyticsPromise,
  ])

  const submissionMap = new Map(submissionStatus.map((item) => [item.classworkId, item.status]))
  const deadlines = upcomingClasswork.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    dueDate: item.dueDate?.toISOString() ?? new Date().toISOString(),
    classId: item.classId,
    className: item.className,
    classColor: item.classColor || "#3b82f6",
    points: item.points,
    isSubmitted:
      submissionMap.get(item.id) === "submitted" || submissionMap.get(item.id) === "graded",
  }))

  const stats = {
    totalClasses: classesData.length,
    pendingTasks: pendingTasks[0]?.count || 0,
    unreadMessages: unreadMessagesResult[0]?.count || 0,
    unreadNotifications: unreadNotificationsResult[0]?.count || 0,
    pendingSubmissions: pendingSubmissions[0]?.count || 0,
    overdueWork: teacherAnalytics?.overdueCount || 0,
    unreadStudentQuestions: teacherAnalytics?.unreadStudentQuestions || 0,
    lowParticipationAlerts: teacherAnalytics?.lowParticipation.length || 0,
  }

  return {
    classes: classesData,
    deadlines,
    stats,
    teacherAnalytics: teacherAnalytics
      ? {
          lowParticipation: teacherAnalytics.lowParticipation,
          reviewQueue: teacherAnalytics.reviewQueue,
          weeklySummary: teacherAnalytics.weeklySummary,
        }
      : null,
  }
}

export async function getHomeActivityData(userId: string) {
  const activityGraphAnchor = new Date().toISOString()
  const [activityGraph, recentActivity] = await Promise.all([
    getActivityGraphData(userId, 18, activityGraphAnchor),
    getActivityLog(userId, { limit: 6 }),
  ])

  return {
    activityGraph: {
      days: activityGraph.days,
      total: activityGraph.total,
    },
    recentActivity: recentActivity.items,
  }
}

type ClassRow = {
  id: string
  title: string
  description: string | null
  category: string | null
  color: string | null
  schedule: string | null
  createdAt: Date | null
  teacherName: string | null
  teacherImage: string | null
}

export async function getClassesPageData(userId?: string) {
  let teachingRows: ClassRow[] = []
  let enrolledRows: ClassRow[] = []

  const enrollmentCountsPromise = db
    .select({
      classId: classMembership.classId,
      count: sql<number>`count(${classMembership.id})`,
    })
    .from(classMembership)
    .where(eq(classMembership.role, "student"))
    .groupBy(classMembership.classId)

  if (userId) {
    const [teachingResult, enrolledResult] = await Promise.all([
      db
        .select({
          id: classes.id,
          title: classes.title,
          description: classes.description,
          category: classes.category,
          color: classes.color,
          schedule: classes.schedule,
          createdAt: classes.createdAt,
          teacherName: user.name,
          teacherImage: user.image,
        })
        .from(classes)
        .innerJoin(
          classMembership,
          and(
            eq(classMembership.classId, classes.id),
            eq(classMembership.userId, userId),
            eq(classMembership.role, "teacher"),
          ),
        )
        .innerJoin(user, eq(classes.ownerId, user.id)),
      db
        .select({
          id: classes.id,
          title: classes.title,
          description: classes.description,
          category: classes.category,
          color: classes.color,
          schedule: classes.schedule,
          createdAt: classes.createdAt,
          teacherName: user.name,
          teacherImage: user.image,
        })
        .from(classes)
        .innerJoin(
          classMembership,
          and(
            eq(classMembership.classId, classes.id),
            eq(classMembership.userId, userId),
            eq(classMembership.role, "student"),
          ),
        )
        .innerJoin(user, eq(classes.ownerId, user.id)),
    ])

    teachingRows = teachingResult
    enrolledRows = enrolledResult
  }

  const enrollmentCounts = await enrollmentCountsPromise
  const countMap = new Map<string, number>()
  enrollmentCounts.forEach((row) => countMap.set(row.classId, Number(row.count)))

  const mapRows = (rows: ClassRow[], role: "teaching" | "enrolled") =>
    rows.map((row) => ({
      ...row,
      createdAt: row.createdAt?.toISOString() ?? "",
      enrolledCount: countMap.get(row.id) ?? 0,
      role,
      teacherName: row.teacherName,
      teacherImage: row.teacherImage,
    }))

  return {
    teachingClasses: mapRows(teachingRows, "teaching"),
    enrolledClasses: mapRows(enrolledRows, "enrolled"),
  }
}

export async function getResourcesPageData() {
  const resourcesList = await db
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
    .orderBy(resources.createdAt)

  return {
    resources: resourcesList.map((resource) => ({
      ...resource,
      createdAt: resource.createdAt?.toISOString() ?? "",
      authorName: resource.authorName,
      authorImage: resource.authorImage,
    })),
  }
}

export async function getNotificationsPageData(userId: string) {
  const notificationsList = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      classId: notifications.classId,
      relatedId: notifications.relatedId,
      read: notifications.read,
      createdAt: notifications.createdAt,
      className: classes.title,
    })
    .from(notifications)
    .leftJoin(classes, eq(notifications.classId, classes.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  return {
    notifications: notificationsList.map((item) => ({
      ...item,
      createdAt: item.createdAt?.toISOString() ?? "",
    })),
  }
}

export async function getMessagesPageData(userId: string) {
  const [conversations, channels] = await Promise.all([
    getConversationSummaries(userId),
    getChannelSummaries(userId),
  ])

  const threads = [...conversations, ...channels].sort((left, right) => {
    const leftTime = left.lastMessageTime ? new Date(left.lastMessageTime).getTime() : 0
    const rightTime = right.lastMessageTime ? new Date(right.lastMessageTime).getTime() : 0
    return rightTime - leftTime
  })

  return {
    threads,
    channels,
  }
}

export async function getActivityPageData(
  userId: string,
  filter: ActivityCategory,
  cursor: string | null,
) {
  const log = await getActivityLog(userId, {
    limit: 50,
    category: filter,
    cursor,
  })

  return {
    items: log.items,
    nextCursor: log.nextCursor,
  }
}

export async function getClassDetailFrameData(classId: string, userId: string) {
  const classData = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
      code: classes.code,
      color: classes.color,
      schedule: classes.schedule,
    })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1)

  if (classData.length === 0) {
    throw new MainRouteDataError(404, "Class not found")
  }

  const membership = await db
    .select({
      role: classMembership.role,
    })
    .from(classMembership)
    .where(and(eq(classMembership.classId, classId), eq(classMembership.userId, userId)))
    .limit(1)

  if (membership.length === 0) {
    throw new MainRouteDataError(403, "You no longer have access to this class.")
  }

  const resolvedClassData: ClassData = {
    id: classData[0].id,
    title: classData[0].title,
    description: classData[0].description,
    category: classData[0].category,
    code: classData[0].code,
    color: classData[0].color || "#3b82f6",
    schedule: classData[0].schedule,
  }

  return {
    classData: resolvedClassData,
    userId,
    userRole: membership[0].role as "teacher" | "student",
  }
}

export async function getClassDetailTabData(
  classId: string,
  userId: string,
  activeTab: ClassDetailTab,
) {
  const frame = await getClassDetailFrameData(classId, userId)
  const userRole = frame.userRole

  let announcementsData: Array<{
    id: string
    content: string
    createdAt: Date
    author: { id: string; name: string; image: string | null }
  }> = []
  let reactionsData: Array<(typeof announcementReactions.$inferSelect)> = []
  let classworkData: Array<{
    id: string
    title: string
    description: string | null
    type: "assignment" | "quiz" | "material"
    dueDate: Date | null
    points: string | null
    createdAt: Date
  }> = []
  let allSubmissions: SubmissionRow[] = []
  let membersData: Array<{
    id: string
    name: string
    email: string
    image: string | null
    role: "teacher" | "student"
  }> = []
  let quizzesData: Array<(typeof quizzes.$inferSelect)> = []
  let quizQuestionsData: Array<(typeof quizQuestions.$inferSelect)> = []
  let quizOptionsData: Array<(typeof quizOptions.$inferSelect)> = []
  let quizAttemptsData: Array<{
    id: string
    quizId: string
    studentId: string
    status: "pending_review" | "graded"
    score: string | null
    startedAt: Date
    submittedAt: Date | null
    gradedAt: Date | null
    timeSpentSeconds: string | null
    createdAt: Date
    student: { id: string; name: string; image: string | null }
  }> = []
  let quizAnswersData: Array<(typeof quizAnswers.$inferSelect)> = []

  if (activeTab === "stream") {
    announcementsData = await db
      .select({
        id: announcements.id,
        content: announcements.content,
        createdAt: announcements.createdAt,
        author: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
      })
      .from(announcements)
      .innerJoin(user, eq(announcements.authorId, user.id))
      .where(eq(announcements.classId, classId))
      .orderBy(desc(announcements.createdAt))

    const announcementIds = announcementsData.map((announcement) => announcement.id)
    reactionsData = announcementIds.length
      ? await db
          .select()
          .from(announcementReactions)
          .where(inArray(announcementReactions.announcementId, announcementIds))
      : []
  }

  if (activeTab === "classwork") {
    const submissionsPromise = db
      .select({
        id: submissions.id,
        classworkId: submissions.classworkId,
        studentId: submissions.studentId,
        content: submissions.content,
        fileUrl: submissions.fileUrl,
        fileName: submissions.fileName,
        status: submissions.status,
        grade: submissions.grade,
        feedback: submissions.feedback,
        submittedAt: submissions.submittedAt,
        gradedAt: submissions.gradedAt,
        student: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
      })
      .from(submissions)
      .innerJoin(user, eq(submissions.studentId, user.id))
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .where(eq(classwork.classId, classId))

    ;[classworkData, allSubmissions] = await Promise.all([
      db
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
        .where(eq(classwork.classId, classId))
        .orderBy(desc(classwork.createdAt)),
      submissionsPromise.then((rows) =>
        rows.map((row) => ({
          ...row,
          attachments: [],
          revisions: [],
          gradingHistory: [],
        })),
      ),
    ])

    const submissionIds = allSubmissions.map((submission) => submission.id)
    const [attachmentsData, revisionsData, gradingHistoryData] = submissionIds.length
      ? await Promise.all([
          db
            .select()
            .from(submissionAttachments)
            .where(inArray(submissionAttachments.submissionId, submissionIds))
            .orderBy(asc(submissionAttachments.createdAt)),
          db
            .select()
            .from(submissionRevisions)
            .where(inArray(submissionRevisions.submissionId, submissionIds))
            .orderBy(desc(submissionRevisions.createdAt)),
          db
            .select()
            .from(gradingHistory)
            .where(inArray(gradingHistory.submissionId, submissionIds))
            .orderBy(desc(gradingHistory.createdAt)),
        ])
      : [[], [], []]

    allSubmissions = allSubmissions.map((submission) => ({
      ...submission,
      attachments: attachmentsData.filter((attachment) => attachment.submissionId === submission.id),
      revisions: revisionsData.filter((revision) => revision.submissionId === submission.id),
      gradingHistory: gradingHistoryData.filter((entry) => entry.submissionId === submission.id),
    }))
  }

  if (activeTab === "people") {
    membersData = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: classMembership.role,
      })
      .from(classMembership)
      .innerJoin(user, eq(classMembership.userId, user.id))
      .where(eq(classMembership.classId, classId))
      .orderBy(asc(classMembership.role), asc(user.name))
  }

  if (activeTab === "quizzes") {
    quizzesData = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.classId, classId))
      .orderBy(asc(quizzes.createdAt))

    const quizIds = quizzesData.map((quiz) => quiz.id)
    if (quizIds.length) {
      quizQuestionsData = await db
        .select()
        .from(quizQuestions)
        .where(inArray(quizQuestions.quizId, quizIds))

      const quizQuestionIds = quizQuestionsData.map((question) => question.id)
      quizOptionsData = quizQuestionIds.length
        ? await db
            .select()
            .from(quizOptions)
            .where(inArray(quizOptions.questionId, quizQuestionIds))
        : []

      quizAttemptsData = await db
        .select({
          id: quizAttempts.id,
          quizId: quizAttempts.quizId,
          studentId: quizAttempts.studentId,
          status: quizAttempts.status,
          score: quizAttempts.score,
          startedAt: quizAttempts.startedAt,
          submittedAt: quizAttempts.submittedAt,
          gradedAt: quizAttempts.gradedAt,
          timeSpentSeconds: quizAttempts.timeSpentSeconds,
          createdAt: quizAttempts.createdAt,
          student: {
            id: user.id,
            name: user.name,
            image: user.image,
          },
        })
        .from(quizAttempts)
        .innerJoin(user, eq(quizAttempts.studentId, user.id))
        .where(
          userRole === "teacher"
            ? inArray(quizAttempts.quizId, quizIds)
            : and(inArray(quizAttempts.quizId, quizIds), eq(quizAttempts.studentId, userId)),
        )

      const attemptIds = quizAttemptsData.map((attempt) => attempt.id)
      quizAnswersData = attemptIds.length
        ? await db
            .select()
            .from(quizAnswers)
            .where(inArray(quizAnswers.attemptId, attemptIds))
        : []
    }
  }

  return {
    announcements: announcementsData.map((announcement) => ({
      ...announcement,
      createdAt: announcement.createdAt?.toISOString() ?? "",
      reactions: reactionsData
        .filter((reaction) => reaction.announcementId === announcement.id)
        .map((reaction) => ({
          userId: reaction.userId,
          reaction: reaction.reaction,
        })),
    })),
    classwork: classworkData.map((item) => ({
      ...item,
      dueDate: item.dueDate?.toISOString() ?? null,
      createdAt: item.createdAt?.toISOString() ?? "",
    })),
    submissions: allSubmissions.map((submission) => ({
      ...submission,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
      gradedAt: submission.gradedAt?.toISOString() ?? null,
      attachments: submission.attachments.map((attachment) => ({
        ...attachment,
        createdAt: attachment.createdAt?.toISOString() ?? "",
      })),
      revisions: submission.revisions.map((revision) => ({
        ...revision,
        submittedAt: revision.submittedAt?.toISOString() ?? null,
        createdAt: revision.createdAt?.toISOString() ?? "",
      })),
      gradingHistory: submission.gradingHistory.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt?.toISOString() ?? "",
      })),
    })),
    quizzes: quizzesData.map((quiz) => {
      const attempt = quizAttemptsData.find((entry) => entry.quizId === quiz.id && entry.studentId === userId)
      const attempts = quizAttemptsData.filter((entry) => entry.quizId === quiz.id)

      return {
        ...quiz,
        dueDate: quiz.dueDate?.toISOString() ?? null,
        createdAt: quiz.createdAt?.toISOString() ?? "",
        updatedAt: quiz.updatedAt?.toISOString() ?? "",
        questions: quizQuestionsData
          .filter((question) => question.quizId === quiz.id)
          .map((question) => ({
            ...question,
            options: quizOptionsData.filter((option) => option.questionId === question.id),
          })),
        attempt: attempt
          ? {
              ...attempt,
              score: attempt.score?.toString() ?? null,
              startedAt: attempt.startedAt?.toISOString() ?? "",
              submittedAt: attempt.submittedAt?.toISOString() ?? null,
              gradedAt: attempt.gradedAt?.toISOString() ?? null,
              timeSpentSeconds: attempt.timeSpentSeconds?.toString() ?? null,
              createdAt: attempt.createdAt?.toISOString() ?? "",
            }
          : null,
        attempts: attempts.map((quizAttempt) => ({
          ...quizAttempt,
          score: quizAttempt.score?.toString() ?? null,
          startedAt: quizAttempt.startedAt?.toISOString() ?? "",
          submittedAt: quizAttempt.submittedAt?.toISOString() ?? null,
          gradedAt: quizAttempt.gradedAt?.toISOString() ?? null,
          timeSpentSeconds: quizAttempt.timeSpentSeconds?.toString() ?? null,
          createdAt: quizAttempt.createdAt?.toISOString() ?? "",
        })),
        answers: quizAnswersData.filter((answer) =>
          quizAttemptsData.find((quizAttempt) => quizAttempt.id === answer.attemptId && quizAttempt.quizId === quiz.id),
        ),
      }
    }),
    members: membersData,
  }
}
