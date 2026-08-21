import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { and, eq, inArray } from "drizzle-orm"

import { QuizTakingPage } from "@/components/classes/quiz-taking-page"
import { db } from "@/db"
import { classMembership, classes, quizAttempts, quizOptions, quizQuestions, quizzes } from "@/db/schema"
import { auth } from "@/lib/auth"

export async function QuizTakingData({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string; quizId: string }>
}) {
  const { id, quizId, orgSlug } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const classData = await db
    .select({
      id: classes.id,
      title: classes.title,
      color: classes.color,
    })
    .from(classes)
    .where(eq(classes.id, id))
    .limit(1)

  if (classData.length === 0) {
    notFound()
  }

  const membership = await db
    .select({
      role: classMembership.role,
    })
    .from(classMembership)
    .where(and(eq(classMembership.classId, id), eq(classMembership.userId, session.user.id)))
    .limit(1)

  if (membership.length === 0) {
    redirect(`/${orgSlug}/classes`)
  }

  if (membership[0].role !== "student") {
    redirect(`/${orgSlug}/classes/${id}?tab=quizzes`)
  }

  const quizRows = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.classId, id)))
    .limit(1)

  if (quizRows.length === 0) {
    notFound()
  }

  const questionRows = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))

  const optionRows = questionRows.length
    ? await db
        .select()
        .from(quizOptions)
        .where(inArray(quizOptions.questionId, questionRows.map((question) => question.id)))
    : []

  const attemptRows = await db
    .select({
      id: quizAttempts.id,
      status: quizAttempts.status,
      score: quizAttempts.score,
      submittedAt: quizAttempts.submittedAt,
      gradedAt: quizAttempts.gradedAt,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, session.user.id)))
    .limit(1)

  const quiz = quizRows[0]

  return (
    <QuizTakingPage
      classId={id}
      classTitle={classData[0].title}
      classColor={classData[0].color || "#0e6b52"}
      quiz={{
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        dueDate: quiz.dueDate?.toISOString() ?? null,
        timeLimitSeconds: quiz.timeLimitSeconds?.toString() ?? null,
        totalPoints: quiz.totalPoints?.toString() ?? null,
        status: quiz.status,
        attempt: attemptRows[0]
          ? {
              id: attemptRows[0].id,
              status: attemptRows[0].status,
              score: attemptRows[0].score?.toString() ?? null,
              submittedAt: attemptRows[0].submittedAt?.toISOString() ?? null,
              gradedAt: attemptRows[0].gradedAt?.toISOString() ?? null,
            }
          : null,
        questions: questionRows.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          type: question.type,
          points: question.points.toString(),
          order: question.order.toString(),
          options: optionRows.filter((option) => option.questionId === question.id),
        })),
      }}
    />
  )
}