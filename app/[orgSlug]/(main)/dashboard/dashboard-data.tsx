import Link from "next/link"
import { Suspense } from "react"
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
  organizations,
  orgMembership,
  orgInvitations,
} from "@/db/schema"
import { getOptionalSession, getUserRole } from "@/lib/server/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import { getActivityLog } from "@/lib/activity"
import { getPulseFacts } from "@/lib/ai/pulse/facts"
import { isPulseEnabled } from "@/lib/ai/policy"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Panel } from "@/components/ui/panel"
import { DashboardOverviewSkeleton } from "@/components/skeletons"
import {
  DashboardAdmin,
  DashboardTeacher,
  DashboardStudent,
  type DashboardViewModel,
  type AdminDashboardViewModel,
  type TeacherDashboardViewModel,
  type StudentDashboardViewModel,
  type DashboardClassItem,
  type AdminAttentionItem,
  type TeacherQueueItem,
  type StudentAttentionItem,
  type StudentNextAction,
  type StudentTimelineItem,
  formatDateLabel,
  getGreeting,
} from "@/components/home/dashboard"

/**
 * Resolves the dashboard's data (session, org membership, Drizzle queries)
 * below the page's Suspense boundary so the route shell commits instantly.
 */
export async function DashboardData({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getOptionalSession()
  const { orgSlug } = await params

  const isAuthenticated = !!session?.user?.id
  const userId = session?.user?.id

  if (!isAuthenticated || !userId) {
    return (
      <Panel padding="none">
        <EmptyState
          size="page"
          icon={<GraduationCap />}
          tone="primary"
          title="Welcome to UpClass"
          description="Browse this organization's classes, or sign in to continue to your own learning workspace."
          action={
            <>
              <Button asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/${orgSlug}/classes`}>Browse classes</Link>
              </Button>
            </>
          }
        />
      </Panel>
    )
  }

  const [organization, membership] = await Promise.all([
    db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1),
    getOrganizationMembership(userId, orgSlug),
  ])

  const orgId = organization[0]?.id
  if (!orgId) return null

  // Admin role takes priority
  const userRole =
    membership?.role === "owner" || membership?.role === "admin"
      ? ("admin" as const)
      : await getUserRole(userId)

  const userName = session.user.name ?? ""

  return (
    <div>
      <Suspense fallback={<DashboardOverviewSkeleton />}>
        <DashboardOverviewSection
          userId={userId}
          userName={userName}
          userRole={userRole}
          orgId={orgId}
          orgSlug={orgSlug}
        />
      </Suspense>
    </div>
  )
}

async function DashboardOverviewSection({
  userId,
  userName,
  userRole,
  orgId,
  orgSlug,
}: {
  userId: string
  userName: string
  userRole: "admin" | "teacher" | "student"
  orgId: string
  orgSlug: string
}) {
  // Build role-specific view model
  let viewModel: DashboardViewModel

  if (userRole === "admin") {
    viewModel = await buildAdminViewModel(userId, orgId, orgSlug)
  } else if (userRole === "teacher") {
    viewModel = await buildTeacherViewModel(userId, orgId, orgSlug)
  } else {
    viewModel = await buildStudentViewModel(userId, orgId, orgSlug)
  }

  // Render role-specific dashboard
  if (viewModel.role === "admin") {
    return <DashboardAdmin viewModel={viewModel} userName={userName} />
  }
  if (viewModel.role === "teacher") {
    return <DashboardTeacher viewModel={viewModel} userName={userName} />
  }
  return <DashboardStudent viewModel={viewModel} userName={userName} />
}

// ============================================================================
// Admin View Model Builder
// ============================================================================

async function buildAdminViewModel(
  userId: string,
  orgId: string,
  orgSlug: string
): Promise<AdminDashboardViewModel> {
  const now = new Date()
  const dateLabel = formatDateLabel(now)
  const greeting = getGreeting(now)

  // Fetch admin-specific data
  const [memberCountResult, classCountResult, invitationCountResult, recentInvitations, recentClasses, activityResult] =
    await Promise.all([
      db.select({ count: count() }).from(orgMembership).where(eq(orgMembership.orgId, orgId)),
      db.select({ count: count() }).from(classes).where(eq(classes.orgId, orgId)),
      db.select({ count: count() }).from(orgInvitations).where(eq(orgInvitations.orgId, orgId)),
      db
        .select({
          id: orgInvitations.id,
          email: orgInvitations.email,
          role: orgInvitations.role,
          createdAt: orgInvitations.createdAt,
        })
        .from(orgInvitations)
        .where(eq(orgInvitations.orgId, orgId))
        .orderBy(desc(orgInvitations.createdAt))
        .limit(5),
      db
        .select({
          id: classes.id,
          title: classes.title,
          color: classes.color,
          createdAt: classes.createdAt,
          memberCount: sql<number>`(SELECT COUNT(*) FROM class_membership WHERE class_membership.class_id = classes.id)`.as("member_count"),
        })
        .from(classes)
        .where(eq(classes.orgId, orgId))
        .orderBy(desc(classes.createdAt))
        .limit(5),
      getActivityLog(userId, { limit: 6 }),
    ])

  const membersCount = Number(memberCountResult[0]?.count ?? 0)
  const classesCount = Number(classCountResult[0]?.count ?? 0)
  const pendingInvitationsCount = Number(invitationCountResult[0]?.count ?? 0)

  // Build status message
  let statusMessage = "Everything is current."
  if (pendingInvitationsCount > 0) {
    statusMessage = `${pendingInvitationsCount} ${pendingInvitationsCount === 1 ? "invitation needs" : "invitations need"} attention.`
  } else if (classesCount === 0 && membersCount === 0) {
    statusMessage = "Organization is empty. Invite people or create classes to get started."
  }

  // Build attention items
  const attention: AdminAttentionItem[] = [
    ...recentInvitations.map((inv) => ({
      kind: "pending_invitation" as const,
      id: inv.id,
      email: inv.email,
      role: inv.role,
      invitedAt: inv.createdAt.toISOString(),
    })),
    ...recentClasses.map((cls) => ({
      kind: "recent_class" as const,
      id: cls.id,
      title: cls.title,
      color: cls.color,
      createdAt: cls.createdAt.toISOString(),
      memberCount: Number(cls.memberCount) || 0,
    })),
  ]

  return {
    role: "admin",
    header: {
      title: `${greeting}`,
      subtitle: "Here is the current state of your organization.",
      dateLabel,
      primaryAction: {
        label: pendingInvitationsCount > 0 ? "Review invitations" : "Open administration",
        href: pendingInvitationsCount > 0 ? `/${orgSlug}/admin/people?tab=invitations` : `/${orgSlug}/admin`,
      },
    },
    operations: {
      membersCount,
      classesCount,
      pendingInvitationsCount,
      statusMessage,
    },
    attention,
    workspace: {
      shortcuts: [
        { label: "Manage people", href: `/${orgSlug}/admin/people`, icon: "users" },
        { label: "Manage classes", href: `/${orgSlug}/admin/classes`, icon: "building" },
        { label: "Invitations", href: `/${orgSlug}/admin/people?tab=invitations`, icon: "mail" },
        { label: "Settings", href: `/${orgSlug}/admin/settings`, icon: "settings" },
      ],
    },
    activity: {
      items: activityResult.items,
    },
    orgSlug,
  }
}

// ============================================================================
// Teacher View Model Builder
// ============================================================================

async function buildTeacherViewModel(
  userId: string,
  orgId: string,
  orgSlug: string
): Promise<TeacherDashboardViewModel> {
  const now = new Date()
  const dateLabel = formatDateLabel(now)
  const greeting = getGreeting(now)

  // Get teacher's classes
  const teacherClasses = await getUserClasses(userId, orgId)
  const ownedClassIds = teacherClasses.filter((c) => c.role === "teacher").map((c) => c.id)

  if (ownedClassIds.length === 0) {
    // Teacher with no classes
    const activityResult = await getActivityLog(userId, { limit: 6 })
    return {
      role: "teacher",
      header: {
        title: `${greeting}`,
        subtitle: "Create a class to start teaching.",
        dateLabel,
        primaryAction: {
          label: "Create class",
          href: `/${orgSlug}/classes`,
        },
      },
      queue: [],
      metrics: [],
      deadlines: [],
      checkIns: [],
      classes: teacherClasses,
      activity: { items: activityResult.items },
      pulse: null,
      orgSlug,
    }
  }

  // Fetch teacher-specific data in parallel
  const [teacherAnalytics, deadlinesData, activityResult, pulseFacts] = await Promise.all([
    getTeacherAnalytics(userId, ownedClassIds),
    getUpcomingClasswork(ownedClassIds, userId, "teacher"),
    getActivityLog(userId, { limit: 6 }),
    isPulseEnabled()
      ? getPulseFacts({ userId, orgId, role: "teacher" }).catch(() => null)
      : Promise.resolve(null),
  ])

  // Build queue items
  const queue: TeacherQueueItem[] = [
    ...teacherAnalytics.reviewQueue.map((review) => ({
      kind: "submission" as const,
      id: `review-${review.submissionId}`,
      submissionId: review.submissionId,
      classworkId: review.classworkId,
      classworkTitle: review.classworkTitle,
      studentName: review.studentName,
      classId: review.classId,
      className: review.className,
      classColor: review.classColor,
      submittedAt: review.submittedAt,
      attachmentCount: review.attachmentCount,
    })),
  ]

  if (teacherAnalytics.unreadStudentQuestions > 0) {
    queue.push({
      kind: "question",
      id: "unread-questions",
      count: teacherAnalytics.unreadStudentQuestions,
      title: "Student inquiries",
    })
  }

  if (teacherAnalytics.overdueCount > 0) {
    queue.push({
      kind: "overdue_alert",
      id: "overdue-alert",
      count: teacherAnalytics.overdueCount,
      title: "Overdue submissions",
    })
  }

  // Build metrics
  const metrics = [
    { label: "To review", value: teacherAnalytics.reviewQueue.length, visible: teacherAnalytics.reviewQueue.length > 0 },
    { label: "Unread questions", value: teacherAnalytics.unreadStudentQuestions, visible: teacherAnalytics.unreadStudentQuestions > 0 },
    { label: "Overdue work", value: teacherAnalytics.overdueCount, visible: teacherAnalytics.overdueCount > 0 },
    { label: "Graded this week", value: teacherAnalytics.weeklySummary.graded, visible: teacherAnalytics.weeklySummary.graded > 0 },
  ]

  // Determine primary action
  let primaryAction = { label: "Open my classes", href: `/${orgSlug}/classes` }
  if (teacherAnalytics.reviewQueue.length > 0) {
    primaryAction = { label: "Review submissions", href: `/${orgSlug}/classes` }
  } else if (teacherAnalytics.unreadStudentQuestions > 0) {
    primaryAction = { label: "Reply to students", href: `/${orgSlug}/messages` }
  }

  return {
    role: "teacher",
    header: {
      title: `${greeting}`,
      subtitle: "Here is what needs your attention across your classes today.",
      dateLabel,
      primaryAction,
    },
    queue,
    metrics,
    deadlines: deadlinesData,
    checkIns: teacherAnalytics.lowParticipation,
    classes: teacherClasses,
    activity: { items: activityResult.items },
    pulse: pulseFacts,
    orgSlug,
  }
}

// ============================================================================
// Student View Model Builder
// ============================================================================

async function buildStudentViewModel(
  userId: string,
  orgId: string,
  orgSlug: string
): Promise<StudentDashboardViewModel> {
  const now = new Date()
  const dateLabel = formatDateLabel(now)
  const greeting = getGreeting(now)

  // Get student's classes
  const studentClasses = await getUserClasses(userId, orgId)
  const enrolledClassIds = studentClasses.map((c) => c.id)

  if (enrolledClassIds.length === 0) {
    // Student with no classes
    const activityResult = await getActivityLog(userId, { limit: 6 })
    return {
      role: "student",
      header: {
        title: `${greeting}`,
        subtitle: "Join a class to start learning.",
        dateLabel,
        primaryAction: {
          label: "Browse classes",
          href: `/${orgSlug}/classes`,
        },
      },
      nextAction: null,
      attention: [],
      timeline: [],
      classes: studentClasses,
      feedback: [],
      messages: [],
      activity: { items: activityResult.items },
      pulse: null,
      orgSlug,
    }
  }

  // Fetch student-specific data in parallel
  const [upcomingWork, submissionStatus, recentFeedback, unreadMessages, activityResult, pulseFacts] = await Promise.all([
    getUpcomingClasswork(enrolledClassIds, userId, "student"),
    db
      .select({
        classworkId: submissions.classworkId,
        status: submissions.status,
        grade: submissions.grade,
        gradedAt: submissions.gradedAt,
      })
      .from(submissions)
      .where(eq(submissions.studentId, userId)),
    db
      .select({
        id: submissions.id,
        classworkId: classwork.id,
        classworkTitle: classwork.title,
        classId: classes.id,
        className: classes.title,
        classColor: classes.color,
        gradedAt: submissions.gradedAt,
        grade: submissions.grade,
        feedback: submissions.feedback,
        points: classwork.points,
      })
      .from(submissions)
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .innerJoin(classes, eq(classwork.classId, classes.id))
      .where(and(eq(submissions.studentId, userId), eq(submissions.status, "graded"), isNotNull(submissions.gradedAt)))
      .orderBy(desc(submissions.gradedAt))
      .limit(5),
    db
      .select({
        id: messages.id,
        senderId: user.id,
        senderName: user.name,
        content: messages.content,
        createdAt: messages.createdAt,
        read: messages.read,
      })
      .from(messages)
      .innerJoin(user, eq(messages.senderId, user.id))
      .where(eq(messages.receiverId, userId))
      .orderBy(desc(messages.createdAt))
      .limit(5),
    getActivityLog(userId, { limit: 6 }),
    isPulseEnabled()
      ? getPulseFacts({ userId, orgId, role: "student" }).catch(() => null)
      : Promise.resolve(null),
  ])

  const submissionMap = new Map(submissionStatus.map((s) => [s.classworkId, s]))

  // Build next action
  const nextAction = selectNextAction(upcomingWork, submissionMap, orgSlug)

  // Build attention items
  const attention = buildStudentAttentionItems(upcomingWork, recentFeedback, unreadMessages, submissionMap)

  // Build timeline
  const timeline = buildStudentTimeline(upcomingWork, submissionMap)

  // Build feedback list
  const feedback = recentFeedback.map((f) => ({
    id: f.id,
    classworkTitle: f.classworkTitle,
    classId: f.classId,
    className: f.className,
    classColor: f.classColor,
    gradedAt: f.gradedAt?.toISOString() ?? "",
    grade: f.grade ?? "",
    feedback: f.feedback,
    points: f.points,
  }))

  // Build messages list
  const messagesList = unreadMessages.map((m) => ({
    id: m.id,
    senderName: m.senderName ?? "Unknown",
    preview: m.content.slice(0, 100),
    createdAt: m.createdAt.toISOString(),
    isRead: m.read,
  }))

  // Determine primary action
  let primaryAction = { label: "Open my classes", href: `/${orgSlug}/classes` }
  if (nextAction) {
    primaryAction = { label: nextAction.actionLabel, href: nextAction.actionHref }
  } else if (attention.length > 0) {
    primaryAction = { label: "View due work", href: `/${orgSlug}/calendar` }
  }

  return {
    role: "student",
    header: {
      title: `${greeting}`,
      subtitle: "Here is what needs your attention across your classes today.",
      dateLabel,
      primaryAction,
    },
    nextAction,
    attention,
    timeline,
    classes: studentClasses,
    feedback,
    messages: messagesList,
    activity: { items: activityResult.items },
    pulse: pulseFacts,
    orgSlug,
  }
}

// ============================================================================
// Shared Helper Functions
// ============================================================================

async function getUserClasses(userId: string, orgId: string): Promise<DashboardClassItem[]> {
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
    .where(and(eq(classes.orgId, orgId), or(eq(classes.ownerId, userId), eq(classMembership.userId, userId))))
    .groupBy(classes.id)
    .orderBy(desc(classes.updatedAt))
    .limit(50)

  return userClasses.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    color: item.color,
    category: item.category,
    memberCount: Number(item.memberCount) || 0,
    role: (item.ownerId === userId ? "teacher" : "student") as "teacher" | "student",
  }))
}

async function getUpcomingClasswork(
  classIds: string[],
  userId: string,
  role: "teacher" | "student"
) {
  if (classIds.length === 0) return []

  const result = await db
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
        sql`${classwork.classId} IN (${sql.join(classIds.map((id) => sql`${id}`), sql`, `)})`,
        isNotNull(classwork.dueDate),
        gte(classwork.dueDate, sql`NOW() - INTERVAL '7 days'`),
      ),
    )
    .orderBy(classwork.dueDate)
    .limit(50)

  return result.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type as "assignment" | "quiz" | "material",
    dueDate: new Date(item.dueDate!),
    classId: item.classId,
    className: item.className,
    classColor: item.classColor,
    points: item.points,
  }))
}

async function getTeacherAnalytics(userId: string, ownedClassIds: string[]) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Get student memberships
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
        sql`${classMembership.classId} IN (${sql.join(ownedClassIds.map((id) => sql`${id}`), sql`, `)})`,
        eq(classMembership.role, "student"),
      ),
    )

  const studentIds = [...new Set(studentMemberships.map((m) => m.userId))]

  // Overdue count
  const overdueResult = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM classwork cw
    INNER JOIN class_membership cm
      ON cm.class_id = cw.class_id
      AND cm.role = 'student'
    LEFT JOIN submissions s
      ON s.classwork_id = cw.id
      AND s.student_id = cm.user_id
    WHERE cw.class_id IN (${sql.join(ownedClassIds.map((id) => sql`${id}`), sql`, `)})
      AND cw.type IN ('assignment', 'quiz')
      AND cw.due_date IS NOT NULL
      AND cw.due_date < NOW()
      AND (s.id IS NULL OR s.status NOT IN ('submitted', 'graded'))
  `)

  // Review queue
  const reviewQueue = await db
    .select({
      submissionId: submissions.id,
      classworkId: classwork.id,
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
        sql`${classwork.classId} IN (${sql.join(ownedClassIds.map((id) => sql`${id}`), sql`, `)})`,
        eq(submissions.status, "submitted"),
      ),
    )
    .groupBy(submissions.id, classes.id, classwork.id, user.id)
    .orderBy(desc(submissions.submittedAt))
    .limit(8)

  // Unread questions
  const [directUnread, channelUnread] = await Promise.all([
    studentIds.length
      ? db
          .select({ count: count() })
          .from(messages)
          .where(
            and(
              eq(messages.receiverId, userId),
              eq(messages.read, false),
              sql`${messages.senderId} IN (${sql.join(studentIds.map((id) => sql`${id}`), sql`, `)})`,
            ),
          )
      : Promise.resolve([{ count: 0 }]),
    db
      .select({ count: count() })
      .from(channelMessages)
      .innerJoin(classChannels, eq(channelMessages.channelId, classChannels.id))
      .where(
        and(
          sql`${classChannels.classId} IN (${sql.join(ownedClassIds.map((id) => sql`${id}`), sql`, `)})`,
          sql`${channelMessages.senderId} != ${userId}`,
          sql`${channelMessages.readBy} NOT LIKE ${`%"${userId}"%`}`,
        ),
      ),
  ])

  // Weekly summary
  const [gradedSummary] = await Promise.all([
    db
      .select({ count: count() })
      .from(submissions)
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .where(
        and(
          sql`${classwork.classId} IN (${sql.join(ownedClassIds.map((id) => sql`${id}`), sql`, `)})`,
          eq(submissions.status, "graded"),
          gte(submissions.gradedAt, sevenDaysAgo),
        ),
      ),
  ])

  // Low participation
  const lowParticipation = (
    await Promise.all(
      studentMemberships.slice(0, 20).map(async (member) => {
        const [[latestActivity], [latestSubmission]] = await Promise.all([
          db
            .select({ occurredAt: activityLog.occurredAt })
            .from(activityLog)
            .where(and(eq(activityLog.actorId, member.userId), eq(activityLog.classId, member.classId)))
            .orderBy(desc(activityLog.occurredAt))
            .limit(1),
          db
            .select({ updatedAt: submissions.updatedAt })
            .from(submissions)
            .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
            .where(and(eq(submissions.studentId, member.userId), eq(classwork.classId, member.classId)))
            .orderBy(desc(submissions.updatedAt))
            .limit(1),
        ])

        const timestamps = [latestActivity?.occurredAt, latestSubmission?.updatedAt]
          .filter(Boolean)
          .map((d) => new Date(d as Date).getTime())

        const lastActiveAt = timestamps.length ? new Date(Math.max(...timestamps)) : null
        if (lastActiveAt && lastActiveAt >= sevenDaysAgo) return null

        return {
          userId: member.userId,
          studentName: member.studentName ?? "Unknown",
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
    unreadStudentQuestions: (directUnread[0]?.count || 0) + (channelUnread[0]?.count || 0),
    reviewQueue: reviewQueue.map((r) => ({
      ...r,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      attachmentCount: Number(r.attachmentCount) || 0,
    })),
    lowParticipation,
    weeklySummary: {
      graded: gradedSummary[0]?.count || 0,
      unreadQuestions: (directUnread[0]?.count || 0) + (channelUnread[0]?.count || 0),
      overdue: Array.from(overdueResult)[0]?.count || 0,
    },
  }
}

function selectNextAction(
  upcomingWork: Array<{ id: string; title: string; type: "assignment" | "quiz" | "material"; dueDate: Date; classId: string; className: string; classColor: string | null; points: string | null }>,
  submissionMap: Map<string, { status: string; grade: string | null; gradedAt: Date | null }>,
  orgSlug: string
): StudentNextAction | null {
  const now = Date.now()

  // Priority 1: Recently graded
  const graded = upcomingWork.find((w) => submissionMap.get(w.id)?.status === "graded")
  if (graded) {
    const submission = submissionMap.get(graded.id)!
    return {
      id: graded.id,
      title: graded.title,
      type: graded.type,
      classId: graded.classId,
      className: graded.className,
      classColor: graded.classColor,
      dueDate: graded.dueDate,
      points: graded.points,
      status: "graded",
      grade: submission.grade,
      actionLabel: "View feedback",
      actionHref: `/${orgSlug}/classes/${graded.classId}?tab=classwork`,
    }
  }

  // Priority 2: Due soonest and not submitted
  const notSubmitted = upcomingWork
    .filter((w) => {
      const status = submissionMap.get(w.id)?.status
      return !status || (status !== "submitted" && status !== "graded")
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0]

  if (notSubmitted) {
    return {
      id: notSubmitted.id,
      title: notSubmitted.title,
      type: notSubmitted.type,
      classId: notSubmitted.classId,
      className: notSubmitted.className,
      classColor: notSubmitted.classColor,
      dueDate: notSubmitted.dueDate,
      points: notSubmitted.points,
      status: "not_started",
      actionLabel: "Start assignment",
      actionHref: `/${orgSlug}/classes/${notSubmitted.classId}?tab=classwork`,
    }
  }

  return null
}

function buildStudentAttentionItems(
  upcomingWork: Array<{ id: string; title: string; type: "assignment" | "quiz" | "material"; dueDate: Date; classId: string; className: string; classColor: string | null; points: string | null }>,
  recentFeedback: Array<{ id: string; classworkTitle: string; classId: string; className: string; classColor: string | null; gradedAt: Date | null; grade: string | null; points: string | null }>,
  unreadMessages: Array<{ id: string; senderName: string | null; content: string; createdAt: Date }>,
  submissionMap: Map<string, { status: string; grade: string | null; gradedAt: Date | null }>
): StudentAttentionItem[] {
  const items: StudentAttentionItem[] = []
  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  // Due soon items (within 7 days, not submitted)
  upcomingWork
    .filter((w) => {
      const dueTime = w.dueDate.getTime()
      if (dueTime > now + sevenDays) return false
      const status = submissionMap.get(w.id)?.status
      return !status || (status !== "submitted" && status !== "graded")
    })
    .slice(0, 5)
    .forEach((w) => {
      items.push({
        kind: "due_soon",
        id: w.id,
        title: w.title,
        type: w.type,
        classId: w.classId,
        className: w.className,
        classColor: w.classColor,
        dueDate: w.dueDate,
        points: w.points,
        isSubmitted: false,
      })
    })

  // Recently graded
  recentFeedback.slice(0, 3).forEach((f) => {
    items.push({
      kind: "graded",
      id: f.id,
      title: f.classworkTitle,
      classId: f.classId,
      className: f.className,
      classColor: f.classColor,
      gradedAt: f.gradedAt?.toISOString() ?? "",
      grade: f.grade ?? "",
      points: f.points,
    })
  })

  // Unread messages
  unreadMessages.slice(0, 2).forEach((m) => {
    items.push({
      kind: "unread_message",
      id: m.id,
      senderName: m.senderName ?? "Unknown",
      preview: m.content.slice(0, 100),
      createdAt: m.createdAt.toISOString(),
    })
  })

  return items
}

function buildStudentTimeline(
  upcomingWork: Array<{ id: string; title: string; type: "assignment" | "quiz" | "material"; dueDate: Date; classId: string; className: string; classColor: string | null; points: string | null }>,
  submissionMap: Map<string, { status: string; grade: string | null; gradedAt: Date | null }>
): StudentTimelineItem[] {
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()
  const tomorrowTime = todayTime + 24 * 60 * 60 * 1000
  const weekTime = todayTime + 7 * 24 * 60 * 60 * 1000

  return upcomingWork.map((w) => {
    const dueTime = w.dueDate.getTime()
    const submission = submissionMap.get(w.id)
    const isSubmitted = submission?.status === "submitted" || submission?.status === "graded"
    const isGraded = submission?.status === "graded"

    let bucket: "today" | "this_week" | "later" | "completed" = "later"
    if (isGraded || isSubmitted) {
      bucket = "completed"
    } else if (dueTime >= todayTime && dueTime < tomorrowTime) {
      bucket = "today"
    } else if (dueTime >= tomorrowTime && dueTime < weekTime) {
      bucket = "this_week"
    }

    return {
      id: w.id,
      title: w.title,
      type: w.type,
      classId: w.classId,
      className: w.className,
      classColor: w.classColor,
      dueDate: w.dueDate,
      points: w.points,
      isSubmitted,
      isGraded,
      bucket,
    }
  })
}
