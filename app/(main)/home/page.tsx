import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { eq, and, or, sql, desc, isNotNull, gte, count } from "drizzle-orm"
import { GraduationCap } from "lucide-react"

import { db } from "@/db"
import {
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

  const [
    unreadMessagesResult,
    unreadNotificationsResult,
    upcomingClasswork,
    submissionStatus,
    pendingTasks,
    pendingSubmissions,
  ] = await Promise.all([
    unreadMessagesPromise,
    unreadNotificationsPromise,
    deadlinesPromise,
    submissionStatusPromise,
    pendingTasksPromise,
    pendingSubmissionsPromise,
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
    </>
  )
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
