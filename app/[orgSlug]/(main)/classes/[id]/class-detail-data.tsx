import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { eq, and, desc, asc, inArray, isNull, lt, or, sql } from "drizzle-orm"

import { ClassDetailHero } from "@/components/classes/class-detail-hero"
import { ClassDetailTabs } from "@/components/classes/class-detail-tabs"
import { ClassDetailLayout } from "@/components/classes/class-detail-layout"
import { ClassDetailRail } from "@/components/classes/class-detail-rail"
import { ClassAiEntry } from "@/components/classes/class-ai-entry"
import {
  ClassDetailTabContentBoundary,
  ClassDetailTabProvider,
} from "@/components/classes/class-detail-tab-provider"
import { ClassDetailContentClient } from "@/components/classes/class-detail-content-client"
import { ClassDetailTabSkeleton } from "@/components/skeletons"
import { db } from "@/db"
import {
  classes,
  classMembership,
  announcements,
  classwork,
  gradingHistory,
  submissionAttachments,
  submissionRevisions,
  submissions,
  user,
  quizzes,
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
  announcementReactions,
  organizations,
} from "@/db/schema"
import { requireSession } from "@/lib/server/auth"
import { getVisibleClassTab, getVisibleTabs } from "@/lib/classes/class-detail-tabs"
import type { ClassData, ClassRailData, ClassRailQueueItem, ClassRailDueItem, ClassRailGrade } from "@/types/classes"

export async function ClassDetailData({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>
  searchParams?: Promise<{ tab?: string; setup?: string; welcome?: string }>
}) {
  const { id, orgSlug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const session = await requireSession()
  const userId = session.user.id

  const classData = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
      gradeLevel: classes.gradeLevel,
      customGrade: classes.customGrade,
      section: classes.section,
      code: classes.code,
      color: classes.color,
      schedule: classes.schedule,
    })
    .from(classes)
    .innerJoin(organizations, eq(classes.orgId, organizations.id))
    .where(and(eq(classes.id, id), eq(organizations.slug, orgSlug)))
    .limit(1)

  if (classData.length === 0) {
    notFound()
  }

  const membership = await db
    .select({
      role: classMembership.role,
    })
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, id),
        eq(classMembership.userId, userId),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    redirect(`/${orgSlug}/classes`)
  }

  const userRole = membership[0].role as "teacher" | "student"
  const requestedTab = resolvedSearchParams?.tab ?? null
  const activeTab = getVisibleClassTab(requestedTab, "stream", userRole)
  const showSetupChecklist = resolvedSearchParams?.setup === "1" && userRole === "teacher"
  const showStudentWelcome = resolvedSearchParams?.welcome === "1" && userRole === "student"
  const visibleTabs = getVisibleTabs(userRole)
  const resolvedClassData: ClassData = {
    id: classData[0].id,
    title: classData[0].title,
    description: classData[0].description,
    category: classData[0].category,
    gradeLevel: classData[0].gradeLevel,
    customGrade: classData[0].customGrade,
    section: classData[0].section,
    code: classData[0].code,
    color: classData[0].color || "#0e6b52",
    schedule: classData[0].schedule,
  }
  const classColor = resolvedClassData.color || "#0e6b52"

  const [enrollmentResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(classMembership)
    .where(and(eq(classMembership.classId, id), eq(classMembership.role, "student")))

  const enrolledCount = Number(enrollmentResult?.count ?? 0)

  const teachers = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(classMembership)
    .innerJoin(user, eq(classMembership.userId, user.id))
    .where(and(eq(classMembership.classId, id), eq(classMembership.role, "teacher")))
    .orderBy(asc(user.name))

  const teacherNames = teachers.map((teacher) => teacher.name)

  const studentPreviews = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(classMembership)
    .innerJoin(user, eq(classMembership.userId, user.id))
    .where(and(eq(classMembership.classId, id), eq(classMembership.role, "student")))
    .orderBy(asc(user.name))
    .limit(5)

  const railData = await buildRailData({ classId: id, userId, userRole })

  return (
    <>
      <ClassAiEntry classId={resolvedClassData.id} classTitle={resolvedClassData.title} />
      <ClassDetailTabProvider activeTab={activeTab} classId={resolvedClassData.id} visibleTabs={visibleTabs}>
        <ClassDetailLayout
          hero={
            <ClassDetailHero
              classData={resolvedClassData}
              classColor={classColor}
              userRole={userRole}
              enrolledCount={enrolledCount}
              teacherNames={teacherNames}
              teachers={teachers}
              students={studentPreviews}
              nextDueDate={railData.nextDue}
            />
          }
          navigation={
            <ClassDetailTabs
              classId={resolvedClassData.id}
              visibleTabs={visibleTabs}
            />
          }
          rail={
            <ClassDetailRail
              classId={resolvedClassData.id}
              classCode={resolvedClassData.code}
              userRole={userRole}
              railData={railData}
            />
          }
        >
          <ClassDetailTabContentBoundary serverActiveTab={activeTab}>
            <Suspense
              key={`${id}-${activeTab}`}
              fallback={<ClassDetailTabSkeleton activeTab={activeTab} />}
            >
              <ClassDetailContentSection
                activeTab={activeTab}
                classData={resolvedClassData}
                classId={id}
                userId={userId}
                userRole={userRole}
                railData={railData}
                showSetupChecklist={showSetupChecklist}
                showStudentWelcome={showStudentWelcome}
              />
            </Suspense>
          </ClassDetailTabContentBoundary>
        </ClassDetailLayout>
      </ClassDetailTabProvider>
    </>
  )
}

type RailQueryInput = {
  classId: string
  userId: string
  userRole: "teacher" | "student"
}

async function buildRailData({ classId, userId, userRole }: RailQueryInput): Promise<ClassRailData> {
  if (userRole === "teacher") {
    const [pendingSubmissions, pendingAttempts] = await Promise.all([
      db
        .select({
          id: submissions.id,
          itemId: classwork.id,
          title: classwork.title,
          studentId: user.id,
          studentName: user.name,
          submittedAt: submissions.submittedAt,
        })
        .from(submissions)
        .innerJoin(user, eq(submissions.studentId, user.id))
        .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
        .where(
          and(
            eq(classwork.classId, classId),
            eq(submissions.status, "submitted"),
          ),
        ),
      db
        .select({
          id: quizAttempts.id,
          itemId: quizzes.id,
          title: quizzes.title,
          studentId: user.id,
          studentName: user.name,
          submittedAt: quizAttempts.submittedAt,
        })
        .from(quizAttempts)
        .innerJoin(user, eq(quizAttempts.studentId, user.id))
        .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .where(
          and(
            eq(quizzes.classId, classId),
            eq(quizAttempts.status, "pending_review"),
          ),
        ),
    ])

    const queue: ClassRailQueueItem[] = [
      ...pendingSubmissions.map((row) => ({
        ...row,
        kind: "classwork" as const,
        submittedAt: row.submittedAt?.toISOString() ?? null,
      })),
      ...pendingAttempts.map((row) => ({
        ...row,
        kind: "quiz" as const,
        submittedAt: row.submittedAt?.toISOString() ?? null,
      })),
    ].sort((left, right) =>
      (right.submittedAt ?? "").localeCompare(left.submittedAt ?? ""),
    )

    return {
      needsGrading: queue.slice(0, 6),
      gradingCounts: {
        classwork: pendingSubmissions.length,
        quizzes: pendingAttempts.length,
      },
      myGrades: [],
      upcomingDue: [],
      nextDue: null,
    }
  }

  const [ownSubmissions, ownAttempts, dueClasswork, dueQuizzes] = await Promise.all([
    db
      .select({
        id: submissions.id,
        itemId: classwork.id,
        title: classwork.title,
        grade: submissions.grade,
        total: classwork.points,
        status: submissions.status,
        updatedAt: submissions.gradedAt,
      })
      .from(submissions)
      .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
      .where(
        and(
          eq(classwork.classId, classId),
          eq(submissions.studentId, userId),
          inArray(submissions.status, ["submitted", "graded"]),
        ),
      ),
    db
      .select({
        id: quizAttempts.id,
        itemId: quizzes.id,
        title: quizzes.title,
        grade: quizAttempts.score,
        total: quizzes.totalPoints,
        status: quizAttempts.status,
        updatedAt: quizAttempts.gradedAt,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(
        and(
          eq(quizzes.classId, classId),
          eq(quizAttempts.studentId, userId),
          inArray(quizAttempts.status, ["pending_review", "graded"]),
        ),
      ),
    db
      .select({
        id: classwork.id,
        title: classwork.title,
        dueDate: classwork.dueDate,
      })
      .from(classwork)
      .leftJoin(submissions, and(eq(submissions.classworkId, classwork.id), eq(submissions.studentId, userId)))
      .where(
        and(
          eq(classwork.classId, classId),
          inArray(classwork.type, ["assignment", "quiz"]),
          isNull(submissions.id),
        ),
      ),
    db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        dueDate: quizzes.dueDate,
      })
      .from(quizzes)
      .leftJoin(quizAttempts, and(eq(quizAttempts.quizId, quizzes.id), eq(quizAttempts.studentId, userId)))
      .where(
        and(
          eq(quizzes.classId, classId),
          eq(quizzes.status, "published"),
          isNull(quizAttempts.id),
        ),
      ),
  ])

  const myGrades: ClassRailGrade[] = [
    ...ownSubmissions.map((row) => ({
      id: row.id,
      kind: "classwork" as const,
      title: row.title,
      grade: row.grade,
      total: row.total,
      status: row.status as ClassRailGrade["status"],
      updatedAt: row.updatedAt?.toISOString() ?? null,
    })),
    ...ownAttempts.map((row) => ({
      id: row.id,
      kind: "quiz" as const,
      title: row.title,
      grade: row.grade,
      total: row.total,
      status: row.status === "graded" ? ("graded" as const) : ("pending_review" as const),
      updatedAt: row.updatedAt?.toISOString() ?? null,
    })),
  ].sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""))

  const dueItems: ClassRailDueItem[] = [
    ...dueClasswork
      .filter((item) => item.dueDate !== null)
      .map((item) => ({
        id: item.id,
        kind: "classwork" as const,
        title: item.title,
        dueDate: (item.dueDate as Date).toISOString(),
      })),
    ...dueQuizzes
      .filter((item) => item.dueDate !== null)
      .map((item) => ({
        id: item.id,
        kind: "quiz" as const,
        title: item.title,
        dueDate: (item.dueDate as Date).toISOString(),
      })),
  ].sort((left, right) => left.dueDate.localeCompare(right.dueDate))

  return {
    needsGrading: [],
    gradingCounts: { classwork: 0, quizzes: 0 },
    myGrades: myGrades.slice(0, 6),
    upcomingDue: dueItems.slice(0, 6),
    nextDue: dueItems[0]?.dueDate ?? null,
  }
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

async function ClassDetailContentSection({
  activeTab,
  classData,
  classId,
  userId,
  userRole,
  railData,
  showSetupChecklist = false,
  showStudentWelcome = false,
}: {
  activeTab: "stream" | "classwork" | "quizzes" | "gradebook" | "people"
  classData: ClassData
  classId: string
  userId: string
  userRole: "teacher" | "student"
  railData: ClassRailData
  showSetupChecklist?: boolean
  showStudentWelcome?: boolean
}) {
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

  if (activeTab === "classwork" || activeTab === "gradebook") {
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

  if (activeTab === "people" || activeTab === "gradebook") {
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

  if (activeTab === "quizzes" || activeTab === "gradebook") {
    quizzesData = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.classId, classId))
      .orderBy(asc(quizzes.createdAt))

    const quizIds = quizzesData.map((quiz) => quiz.id)
    if (quizIds.length) {
      const [questionsData, attemptsData] = await Promise.all([
        db
          .select()
          .from(quizQuestions)
          .where(inArray(quizQuestions.quizId, quizIds)),
        db
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
              : and(
                  inArray(quizAttempts.quizId, quizIds),
                  eq(quizAttempts.studentId, userId),
                ),
          ),
      ])
      quizQuestionsData = questionsData
      quizAttemptsData = attemptsData

      const quizQuestionIds = quizQuestionsData.map((question) => question.id)
      quizOptionsData = quizQuestionIds.length
        ? await db
            .select()
            .from(quizOptions)
            .where(inArray(quizOptions.questionId, quizQuestionIds))
        : []

      const attemptIds = quizAttemptsData.map((attempt) => attempt.id)
      quizAnswersData = attemptIds.length
        ? await db
            .select()
            .from(quizAnswers)
            .where(inArray(quizAnswers.attemptId, attemptIds))
        : []
    }
  }

  return (
    <ClassDetailContentClient
      activeTab={activeTab}
      classData={classData}
      userId={userId}
      userRole={userRole}
      railData={railData}
      announcements={announcementsData.map((announcement) => ({
        ...announcement,
        createdAt: announcement.createdAt?.toISOString() ?? "",
        reactions: reactionsData
          .filter((reaction) => reaction.announcementId === announcement.id)
          .map((reaction) => ({
            userId: reaction.userId,
            reaction: reaction.reaction,
          })),
      }))}
      classwork={classworkData.map((item) => ({
        ...item,
        dueDate: item.dueDate?.toISOString() ?? null,
        createdAt: item.createdAt?.toISOString() ?? "",
      }))}
      submissions={allSubmissions.map((submission) => ({
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
      }))}
      quizzes={quizzesData.map((quiz) => {
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
      })}
      members={membersData}
      showSetupChecklist={showSetupChecklist}
      showStudentWelcome={showStudentWelcome}
    />
  )
}
