import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { eq, and, or, sql, desc, isNotNull, gte, count } from "drizzle-orm"
import { GraduationCap } from "lucide-react"

import { db } from "@/db"
import {
  activityLog,
  channelMessages,
  classChannels,
  submissionAttachments,
  user,
  classes,
  classMembership,
  classwork,
  submissions,
  messages,
  notifications,
} from "@/db/schema"
import { getActivityGraphData, getActivityLog } from "@/lib/activity"
import { getOptionalSession } from "@/lib/server/auth"
import { Button } from "@/components/ui/button"
import { HomeActivitySkeleton, HomeOverviewSkeleton } from "@/components/skeletons"
import { GreetingCard } from "@/components/home/greeting-card"
import { StatsCards, type StatsData } from "@/components/home/stats-cards"
import { DeadlineWidget, type DeadlineItem } from "@/components/home/deadline-widget"
import { RecentClasses, type ClassItem } from "@/components/home/recent-classes"
import { ActivityGraphCard } from "@/components/home/activity-graph-card"
import { RecentActivityCard } from "@/components/home/recent-activity-card"
import { TeacherAnalyticsPanel } from "@/components/home/teacher-analytics-panel"

export const metadata: Metadata = {
  title: "Home",
}

export default async function HomePage() {
  const session = await getOptionalSession()

  const isAuthenticated = !!session?.user?.id
  const userId = session?.user?.id

  if (!isAuthenticated || !userId) {
    return (
      <section className="flex-1 space-y-6">
        <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/5 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-foreground">Welcome to UpClass</h3>
          <p className="mt-2 max-w-md mx-auto text-muted-foreground">
            Discover classes, browse resources, and start your learning journey. Sign in to access all features.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/classes">Browse Classes</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const [userData] = await db
    .select({
      role: user.role,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  const userRole = userData?.role ?? null
  const userName = userData?.name || session.user.name || "User"

  return (
    <section className="flex-1 space-y-6">
      <GreetingCard userName={userName} role={userRole} />

      <Suspense fallback={<HomeOverviewSkeleton />}>
        <HomeOverviewSection userId={userId} userRole={userRole} />
      </Suspense>

      <Suspense fallback={<HomeActivitySkeleton />}>
        <HomeActivitySection userId={userId} />
      </Suspense>
    </section>
  )
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
  })) satisfies ClassItem[]
}

async function HomeOverviewSection({
  userId,
  userRole,
}: {
  userId: string
  userRole: "teacher" | "student" | null
}) {
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
  const deadlinesData: DeadlineItem[] = upcomingClasswork.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    dueDate: new Date(item.dueDate!),
    classId: item.classId,
    className: item.className,
    classColor: item.classColor || "#3b82f6",
    points: item.points,
    isSubmitted:
      submissionMap.get(item.id) === "submitted" || submissionMap.get(item.id) === "graded",
  }))

  const statsData: StatsData = {
    totalClasses: classesData.length,
    pendingTasks: pendingTasks[0]?.count || 0,
    unreadMessages: unreadMessagesResult[0]?.count || 0,
    unreadNotifications: unreadNotificationsResult[0]?.count || 0,
    pendingSubmissions: pendingSubmissions[0]?.count || 0,
    overdueWork: teacherAnalytics?.overdueCount || 0,
    unreadStudentQuestions: teacherAnalytics?.unreadStudentQuestions || 0,
    lowParticipationAlerts: teacherAnalytics?.lowParticipation.length || 0,
  }

  return (
    <>
      <StatsCards stats={statsData} role={userRole} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <DeadlineWidget deadlines={deadlinesData} role={userRole} />
        </div>
        <div className="lg:col-span-2">
          <RecentClasses classes={classesData} userRole={userRole} />
        </div>
      </div>

      {userRole === "teacher" && teacherAnalytics ? (
        <TeacherAnalyticsPanel
          lowParticipation={teacherAnalytics.lowParticipation}
          reviewQueue={teacherAnalytics.reviewQueue}
          weeklySummary={teacherAnalytics.weeklySummary}
        />
      ) : null}
    </>
  )
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

  const lowParticipation = (
    await Promise.all(
      studentMemberships.map(async (member) => {
        const [[latestActivity], [latestSubmission], [latestMessage], [latestChannelMessage]] =
          await Promise.all([
            db
              .select({ occurredAt: activityLog.occurredAt })
              .from(activityLog)
              .where(
                and(eq(activityLog.actorId, member.userId), eq(activityLog.classId, member.classId)),
              )
              .orderBy(desc(activityLog.occurredAt))
              .limit(1),
            db
              .select({ updatedAt: submissions.updatedAt })
              .from(submissions)
              .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
              .where(
                and(eq(submissions.studentId, member.userId), eq(classwork.classId, member.classId)),
              )
              .orderBy(desc(submissions.updatedAt))
              .limit(1),
            db
              .select({ createdAt: messages.createdAt })
              .from(messages)
              .where(and(eq(messages.senderId, member.userId), eq(messages.receiverId, userId)))
              .orderBy(desc(messages.createdAt))
              .limit(1),
            db
              .select({ createdAt: channelMessages.createdAt })
              .from(channelMessages)
              .innerJoin(classChannels, eq(channelMessages.channelId, classChannels.id))
              .where(
                and(eq(channelMessages.senderId, member.userId), eq(classChannels.classId, member.classId)),
              )
              .orderBy(desc(channelMessages.createdAt))
              .limit(1),
          ])

        const timestamps = [
          latestActivity?.occurredAt,
          latestSubmission?.updatedAt,
          latestMessage?.createdAt,
          latestChannelMessage?.createdAt,
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
      }),
    )
  )
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

async function HomeActivitySection({ userId }: { userId: string }) {
  const activityGraphAnchor = new Date().toISOString()
  const [activityGraph, recentActivity] = await Promise.all([
    getActivityGraphData(userId, 18, activityGraphAnchor),
    getActivityLog(userId, { limit: 6 }),
  ])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ActivityGraphCard days={activityGraph.days} total={activityGraph.total} />
      </div>
      <div className="lg:col-span-1">
        <RecentActivityCard items={recentActivity.items} />
      </div>
    </div>
  )
}
