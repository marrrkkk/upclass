import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import {
  user,
  classes,
  classMembership,
  classwork,
  submissions,
  messages,
  notifications
} from "@/db/schema"
import { eq, and, or, sql, desc, isNotNull, gte, count } from "drizzle-orm"
import { Button } from "@/components/ui/button"
import { GraduationCap } from "lucide-react"
import { getActivityGraphData, getActivityLog } from "@/lib/activity"

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
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isAuthenticated = !!session?.user?.id
  const userId = session?.user?.id

  // For unauthenticated users, show a welcome page
  if (!isAuthenticated || !userId) {
    return (
      <section className="flex-1 space-y-6">
        <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/5 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-foreground">
            Welcome to UpClass
          </h3>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
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

  // Get user data with role
  const userData = await db
    .select({
      role: user.role,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  const userRole = userData[0]?.role
  const userName = userData[0]?.name || session.user.name || "User"

  // Get user's classes (both owned and member of)
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
    .where(
      or(
        eq(classes.ownerId, userId),
        eq(classMembership.userId, userId)
      )
    )
    .groupBy(classes.id)
    .orderBy(desc(classes.updatedAt))
    .limit(50)

  // Transform classes data
  const classesData: ClassItem[] = userClasses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
    color: c.color || "#3b82f6",
    category: c.category,
    memberCount: Number(c.memberCount) || 0,
    role: c.ownerId === userId ? "teacher" : "student" as "teacher" | "student",
  }))

  // Get class IDs for further queries
  const classIds = classesData.map(c => c.id)

  // Get upcoming deadlines (classwork with due dates)
  let deadlinesData: DeadlineItem[] = []

  if (classIds.length > 0) {
    const upcomingClasswork = await db
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
          sql`${classwork.classId} IN (${sql.join(classIds.map(id => sql`${id}`), sql`, `)})`,
          isNotNull(classwork.dueDate),
          // Include items due in the past 7 days (for overdue) and future
          gte(classwork.dueDate, sql`NOW() - INTERVAL '7 days'`)
        )
      )
      .orderBy(classwork.dueDate)
      .limit(50)

    // For students, check submission status
    if (userRole === "student") {
      const submissionStatus = await db
        .select({
          classworkId: submissions.classworkId,
          status: submissions.status,
        })
        .from(submissions)
        .where(eq(submissions.studentId, userId))

      const submissionMap = new Map(submissionStatus.map(s => [s.classworkId, s.status]))

      deadlinesData = upcomingClasswork.map((cw) => ({
        id: cw.id,
        title: cw.title,
        type: cw.type,
        dueDate: new Date(cw.dueDate!),
        classId: cw.classId,
        className: cw.className,
        classColor: cw.classColor || "#3b82f6",
        points: cw.points,
        isSubmitted: submissionMap.get(cw.id) === "submitted" || submissionMap.get(cw.id) === "graded",
      }))
    } else {
      deadlinesData = upcomingClasswork.map((cw) => ({
        id: cw.id,
        title: cw.title,
        type: cw.type,
        dueDate: new Date(cw.dueDate!),
        classId: cw.classId,
        className: cw.className,
        classColor: cw.classColor || "#3b82f6",
        points: cw.points,
      }))
    }
  }

  // Get stats
  // Total classes count
  const totalClassesCount = classesData.length

  // Pending tasks (for students) - classwork not submitted
  let pendingTasksCount = 0
  if (userRole === "student" && classIds.length > 0) {
    const pendingTasks = await db
      .select({ count: count() })
      .from(classwork)
      .leftJoin(
        submissions,
        and(
          eq(submissions.classworkId, classwork.id),
          eq(submissions.studentId, userId)
        )
      )
      .where(
        and(
          sql`${classwork.classId} IN (${sql.join(classIds.map(id => sql`${id}`), sql`, `)})`,
          or(
            eq(classwork.type, "assignment"),
            eq(classwork.type, "quiz")
          ),
          sql`${submissions.id} IS NULL`
        )
      )
    pendingTasksCount = pendingTasks[0]?.count || 0
  }

  // Pending submissions (for teachers) - submissions to grade
  let pendingSubmissionsCount = 0
  if (userRole === "teacher" && classIds.length > 0) {
    const ownedClassIds = classesData.filter(c => c.role === "teacher").map(c => c.id)
    if (ownedClassIds.length > 0) {
      const pendingSubmissions = await db
        .select({ count: count() })
        .from(submissions)
        .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
        .where(
          and(
            sql`${classwork.classId} IN (${sql.join(ownedClassIds.map(id => sql`${id}`), sql`, `)})`,
            eq(submissions.status, "submitted")
          )
        )
      pendingSubmissionsCount = pendingSubmissions[0]?.count || 0
    }
  }

  // Unread messages
  const unreadMessagesResult = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(
        eq(messages.receiverId, userId),
        eq(messages.read, false)
      )
    )
  const unreadMessagesCount = unreadMessagesResult[0]?.count || 0

  // Unread notifications
  const unreadNotificationsResult = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      )
    )
  const unreadNotificationsCount = unreadNotificationsResult[0]?.count || 0

  const activityGraphAnchor = new Date().toISOString()

  const [activityGraph, recentActivity] = await Promise.all([
    getActivityGraphData(userId, 18, activityGraphAnchor),
    getActivityLog(userId, { limit: 6 }),
  ])

  const statsData: StatsData = {
    totalClasses: totalClassesCount,
    pendingTasks: pendingTasksCount,
    unreadMessages: unreadMessagesCount,
    unreadNotifications: unreadNotificationsCount,
    pendingSubmissions: pendingSubmissionsCount,
  }

  return (
    <section className="flex-1 space-y-6">
      {/* Greeting */}
      <GreetingCard userName={userName} role={userRole} />

      {/* Stats */}
      <StatsCards stats={statsData} role={userRole} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deadlines - Takes 1 column on large screens */}
        <div className="lg:col-span-1">
          <DeadlineWidget deadlines={deadlinesData} role={userRole} />
        </div>

        {/* Recent Classes - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <RecentClasses classes={classesData} userRole={userRole} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityGraphCard days={activityGraph.days} total={activityGraph.total} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityCard items={recentActivity.items} />
        </div>
      </div>
    </section>
  )
}
