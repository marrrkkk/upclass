import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { eq, and, desc, asc, inArray } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import {
  classes,
  classMembership,
  announcements,
  classwork,
  submissions,
  user,
  quizzes,
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
} from "@/db/schema"
import { ClassDetailClient } from "@/components/classes/class-detail-client"

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isAuthenticated = !!session?.user?.id
  const userId = session?.user?.id

  // Get class data - allow public viewing
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
    .where(eq(classes.id, id))
    .limit(1)

  if (classData.length === 0) {
    notFound()
  }

  // Check if user is a member (only if authenticated)
  let membership: Array<{ role: string }> = []
  let userRole: "teacher" | "student" | null = null

  if (isAuthenticated && userId) {
    membership = await db
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

    if (membership.length > 0) {
      userRole = membership[0].role as "teacher" | "student"
    }
  }

  // Get announcements with author info - allow public viewing
  const announcementsData = await db
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
    .where(eq(announcements.classId, id))
    .orderBy(desc(announcements.createdAt))

  // Get classwork with submission counts - allow public viewing
  const classworkData = await db
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
    .where(eq(classwork.classId, id))
    .orderBy(desc(classwork.createdAt))

  // Get all submissions for this class - only if user is a member
  let allSubmissions: any[] = []
  if (isAuthenticated && userRole) {
    allSubmissions = await db
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
      .where(eq(classwork.classId, id))
  }

  // Get all members - allow public viewing
  const membersData = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: classMembership.role,
    })
    .from(classMembership)
    .innerJoin(user, eq(classMembership.userId, user.id))
    .where(eq(classMembership.classId, id))
    .orderBy(asc(classMembership.role), asc(user.name))

  // Quizzes data (class members only)
  const quizzesData = isAuthenticated && userRole
    ? await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.classId, id))
      .orderBy(asc(quizzes.createdAt))
    : []

  const quizIds = quizzesData.map((q) => q.id)
  const quizQuestionsData = quizIds.length
    ? await db.select().from(quizQuestions).where(inArray(quizQuestions.quizId, quizIds))
    : []
  const quizQuestionIds = quizQuestionsData.map((q) => q.id)
  const quizOptionsData = quizQuestionIds.length
    ? await db.select().from(quizOptions).where(inArray(quizOptions.questionId, quizQuestionIds))
    : []
  const quizAttemptsData = isAuthenticated && quizIds.length
    ? await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, quizIds),
          eq(quizAttempts.studentId, session?.user?.id || ""),
        ),
      )
    : []
  const attemptIds = quizAttemptsData.map((a) => a.id)
  const quizAnswersData = attemptIds.length
    ? await db.select().from(quizAnswers).where(inArray(quizAnswers.attemptId, attemptIds))
    : []

  return (
    <ClassDetailClient
      classData={{
        id: classData[0].id,
        title: classData[0].title,
        description: classData[0].description,
        category: classData[0].category,
        code: classData[0].code,
        color: classData[0].color || "#3b82f6",
        schedule: classData[0].schedule,
      }}
      userId={userId}
      userRole={userRole}
      announcements={announcementsData.map((a) => ({
        ...a,
        createdAt: a.createdAt?.toISOString() ?? "",
      }))}
      classwork={classworkData.map((c) => ({
        ...c,
        dueDate: c.dueDate?.toISOString() ?? null,
        createdAt: c.createdAt?.toISOString() ?? "",
      }))}
      submissions={allSubmissions.map((s) => ({
        ...s,
        submittedAt: s.submittedAt?.toISOString() ?? null,
        gradedAt: s.gradedAt?.toISOString() ?? null,
      }))}
      quizzes={quizzesData.map((q) => ({
        ...q,
        dueDate: q.dueDate?.toISOString() ?? null,
        createdAt: q.createdAt?.toISOString() ?? "",
        updatedAt: q.updatedAt?.toISOString() ?? "",
        questions: quizQuestionsData
          .filter((qq) => qq.quizId === q.id)
          .map((qq) => ({
            ...qq,
            options: quizOptionsData.filter((opt) => opt.questionId === qq.id),
          })),
        attempt: quizAttemptsData.find((a) => a.quizId === q.id) || null,
        answers: quizAnswersData.filter((a) =>
          quizAttemptsData.find((att) => att.id === a.attemptId && att.quizId === q.id),
        ),
      }))}
      members={membersData}
      isAuthenticated={isAuthenticated}
    />
  )
}

