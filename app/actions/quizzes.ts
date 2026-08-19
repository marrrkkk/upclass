"use server"

import { headers } from "next/headers"
import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import {
  quizAttempts,
  quizAnswers,
  quizOptions,
  quizQuestions,
  quizzes,
  classMembership,
} from "@/db/schema"
import { auth } from "@/lib/auth"
import { revalidateClassOrg } from "@/lib/server/revalidate"
import { logActivity } from "@/lib/activity"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

type GradeQuizPayload = {
  answers: Array<{
    answerId: string
    pointsAwarded: number
  }>
}

type QuizPayload = {
  title: string
  description?: string
  dueDate?: string | null
  status: "draft" | "published"
  timeLimitSeconds?: number | null
  questions: Array<{
    prompt: string
    type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
    points: number
    options?: Array<{ text: string; isCorrect?: boolean }>
    order: number
  }>
}

type NormalizedQuizPayload = {
  title: string
  description: string | null
  dueDate: string | null
  status: "draft" | "published"
  timeLimitSeconds: number | null
  questions: Array<{
    prompt: string
    type: "single_choice" | "multiple_select" | "true_false" | "short_answer"
    points: number
    options: Array<{ text: string; isCorrect: boolean }>
    order: number
  }>
}

function normalizeQuizPayload(payload: QuizPayload):
  | { success: true; data: NormalizedQuizPayload }
  | { success: false; error: string } {
  if (!payload.title?.trim()) return { success: false, error: "Title is required" }
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    return { success: false, error: "At least one question is required" }
  }

  const questions: NormalizedQuizPayload["questions"] = []

  for (const [index, question] of payload.questions.entries()) {
    if (!question.prompt?.trim()) {
      return { success: false, error: `Question ${index + 1} requires a prompt` }
    }

    const points = Number(question.points)
    if (!Number.isFinite(points) || points < 0) {
      return { success: false, error: `Question ${index + 1} has invalid points` }
    }

    if (question.type === "short_answer") {
      questions.push({
        prompt: question.prompt.trim(),
        type: question.type,
        points,
        options: [],
        order: question.order ?? index,
      })
      continue
    }

    if (question.type === "true_false") {
      const selectedCorrect = question.options?.find((option) => option.isCorrect)
      const correctLabel = selectedCorrect?.text?.trim().toLowerCase() === "false" ? "False" : "True"

      questions.push({
        prompt: question.prompt.trim(),
        type: question.type,
        points,
        order: question.order ?? index,
        options: [
          { text: "True", isCorrect: correctLabel === "True" },
          { text: "False", isCorrect: correctLabel === "False" },
        ],
      })
      continue
    }

    const options = (question.options || [])
      .map((option) => ({
        text: option.text?.trim() || "",
        isCorrect: !!option.isCorrect,
      }))
      .filter((option) => option.text.length > 0)

    if (options.length < 2) {
      return { success: false, error: `Question ${index + 1} needs at least two options` }
    }

    if (question.type === "single_choice") {
      const firstCorrectIndex = options.findIndex((option) => option.isCorrect)
      questions.push({
        prompt: question.prompt.trim(),
        type: question.type,
        points,
        order: question.order ?? index,
        options: options.map((option, optionIndex) => ({
          text: option.text,
          isCorrect: firstCorrectIndex >= 0 ? optionIndex === firstCorrectIndex : optionIndex === 0,
        })),
      })
      continue
    }

    if (!options.some((option) => option.isCorrect)) {
      return { success: false, error: `Question ${index + 1} needs at least one correct answer` }
    }

    questions.push({
      prompt: question.prompt.trim(),
      type: question.type,
      points,
      order: question.order ?? index,
      options,
    })
  }

  return {
    success: true,
    data: {
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      dueDate: payload.dueDate || null,
      status: payload.status,
      timeLimitSeconds:
        payload.timeLimitSeconds != null && Number.isFinite(Number(payload.timeLimitSeconds))
          ? Number(payload.timeLimitSeconds)
          : null,
      questions,
    },
  }
}

export async function createQuiz(classId: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Must be teacher
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classId),
        eq(classMembership.userId, session.user.id),
        eq(classMembership.role, "teacher"),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Only teachers can create quizzes" }
  }

  const raw = formData.get("payload") as string | null
  if (!raw) return { success: false, error: "Missing payload" }

  let payload: QuizPayload
  try {
    payload = JSON.parse(raw) as QuizPayload
  } catch {
    return { success: false, error: "Invalid payload" }
  }

  const normalized = normalizeQuizPayload(payload)
  if (!normalized.success) return normalized

  const quizPayload = normalized.data

  try {
    const quizId = crypto.randomUUID()
    const totalPoints = quizPayload.questions.reduce((sum, q) => sum + q.points, 0)
    await db.insert(quizzes).values({
      id: quizId,
      classId,
      title: quizPayload.title,
      description: quizPayload.description,
      status: quizPayload.status,
      dueDate: quizPayload.dueDate ? new Date(quizPayload.dueDate) : null,
      timeLimitSeconds:
        quizPayload.timeLimitSeconds != null ? String(quizPayload.timeLimitSeconds) : null,
      totalPoints: String(totalPoints),
      createdBy: session.user.id,
    })

    for (const question of quizPayload.questions) {
      const questionId = crypto.randomUUID()
      await db.insert(quizQuestions).values({
        id: questionId,
        quizId,
        prompt: question.prompt,
        type: question.type,
        points: String(question.points),
        order: String(question.order ?? 0),
      })

      if (question.type !== "short_answer" && question.options) {
        const optionRows = question.options.map((opt) => ({
          id: crypto.randomUUID(),
          questionId,
          text: opt.text,
          isCorrect: !!opt.isCorrect,
        }))
        if (optionRows.length > 0) {
          await db.insert(quizOptions).values(optionRows)
        }
      }
    }

    await revalidateClassOrg(classId, ["classes", `classes/${classId}`, "home", "activity"])

    await logActivity({
      actorId: session.user.id,
      eventType: "quiz_created",
      entityType: "quiz",
      entityId: quizId,
      classId,
      title: `Created quiz "${quizPayload.title}"`,
      description: quizPayload.description,
    })

    return { success: true }
  } catch (err) {
    console.error("createQuiz error", err)
    return { success: false, error: "Failed to create quiz" }
  }
}

export async function updateQuiz(quizId: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Get quiz to find classId
  const quizData = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1)

  if (quizData.length === 0) {
    return { success: false, error: "Quiz not found" }
  }

  const classId = quizData[0].classId

  // Must be teacher
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, classId),
        eq(classMembership.userId, session.user.id),
        eq(classMembership.role, "teacher"),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Only teachers can edit quizzes" }
  }

  const raw = formData.get("payload") as string | null
  if (!raw) return { success: false, error: "Missing payload" }

  let payload: QuizPayload
  try {
    payload = JSON.parse(raw) as QuizPayload
  } catch {
    return { success: false, error: "Invalid payload" }
  }

  const normalized = normalizeQuizPayload(payload)
  if (!normalized.success) return normalized

  const quizPayload = normalized.data

  try {
    const totalPoints = quizPayload.questions.reduce((sum, q) => sum + q.points, 0)

    // Update quiz
    await db.update(quizzes).set({
      title: quizPayload.title,
      description: quizPayload.description,
      status: quizPayload.status,
      dueDate: quizPayload.dueDate ? new Date(quizPayload.dueDate) : null,
      timeLimitSeconds:
        quizPayload.timeLimitSeconds != null ? String(quizPayload.timeLimitSeconds) : null,
      totalPoints: String(totalPoints),
      updatedAt: new Date(),
    }).where(eq(quizzes.id, quizId))

    // Delete existing questions (cascade will delete options)
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId))

    // Insert new questions
    for (const question of quizPayload.questions) {
      const questionId = crypto.randomUUID()
      await db.insert(quizQuestions).values({
        id: questionId,
        quizId,
        prompt: question.prompt,
        type: question.type,
        points: String(question.points),
        order: String(question.order ?? 0),
      })

      if (question.type !== "short_answer" && question.options) {
        const optionRows = question.options.map((opt) => ({
          id: crypto.randomUUID(),
          questionId,
          text: opt.text,
          isCorrect: !!opt.isCorrect,
        }))
        if (optionRows.length > 0) {
          await db.insert(quizOptions).values(optionRows)
        }
      }
    }

    await revalidateClassOrg(classId, [`classes/${classId}`])
    return { success: true }
  } catch (err) {
    console.error("updateQuiz error", err)
    return { success: false, error: "Failed to update quiz" }
  }
}

export async function submitQuiz(quizId: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Ensure membership
  const quizRow = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1)
  if (quizRow.length === 0) return { success: false, error: "Quiz not found" }

  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, quizRow[0].classId),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)
  if (membership.length === 0) return { success: false, error: "Not a class member" }

  // Check published
  if (quizRow[0].status !== "published") {
    return { success: false, error: "Quiz is not available" }
  }

  // Ensure not already attempted
  const existingAttempt = await db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, session.user.id)),
    )
    .limit(1)
  if (existingAttempt.length > 0) return { success: false, error: "You already took this quiz" }

  const raw = formData.get("answers") as string | null
  const timeSpentSeconds = formData.get("timeSpentSeconds") as string | null
  if (!raw) return { success: false, error: "Missing answers" }

  let answersPayload: Array<{
    questionId: string
    selectedOptionIds?: string[]
    textAnswer?: string
  }>
  try {
    answersPayload = JSON.parse(raw)
  } catch {
    return { success: false, error: "Invalid answers payload" }
  }

  try {
    // Get questions/options for grading
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
    const questionMap = new Map(questions.map((q) => [q.id, q]))
    const requiresManualReview = questions.some((question) => question.type === "short_answer")

    const options = await db
      .select()
      .from(quizOptions)
      .where(inArray(quizOptions.questionId, questions.map((q) => q.id)))
    const optionMap = new Map<string, { id: string; text: string; isCorrect: boolean }[]>()
    for (const opt of options) {
      const arr = optionMap.get(opt.questionId) || []
      arr.push({ id: opt.id, text: opt.text, isCorrect: opt.isCorrect })
      optionMap.set(opt.questionId, arr)
    }

    const attemptId = crypto.randomUUID()
    // Create attempt first to satisfy FK for answers
    await db.insert(quizAttempts).values({
      id: attemptId,
      quizId,
      studentId: session.user.id,
      status: requiresManualReview ? "pending_review" : "graded",
      score: null,
      submittedAt: new Date(),
      gradedAt: requiresManualReview ? null : new Date(),
      timeSpentSeconds: timeSpentSeconds || null,
    })

    let score = 0

    for (const ans of answersPayload) {
      const q = questionMap.get(ans.questionId)
      if (!q) continue
      let isCorrect: boolean | null = null
      let awarded = 0

      if (q.type === "short_answer") {
        // Manual grading later
        isCorrect = null
        awarded = 0
      } else if (q.type === "true_false" || q.type === "single_choice") {
        const correctOpts = (optionMap.get(q.id) || []).filter((o) => o.isCorrect)
        const isCorrectChoice =
          correctOpts.length === 1 &&
          ans.selectedOptionIds &&
          ans.selectedOptionIds.length === 1 &&
          ans.selectedOptionIds.includes(correctOpts[0].id)
        isCorrect = isCorrectChoice ?? null
        awarded = isCorrect ? Number(q.points) : 0
      } else if (q.type === "multiple_select") {
        const correctOpts = (optionMap.get(q.id) || []).filter((o) => o.isCorrect).map((o) => o.id)
        const selected = ans.selectedOptionIds || []
        const allCorrect =
          correctOpts.length === selected.length &&
          correctOpts.every((opt) => selected.includes(opt))
        isCorrect = allCorrect
        awarded = allCorrect ? Number(q.points) : 0
      }

      score += awarded

      await db.insert(quizAnswers).values({
        id: crypto.randomUUID(),
        attemptId,
        questionId: q.id,
        selectedOptionIds: ans.selectedOptionIds ? JSON.stringify(ans.selectedOptionIds) : null,
        textAnswer: ans.textAnswer || null,
        isCorrect,
        pointsAwarded: q.type === "short_answer" ? null : String(awarded),
      })
    }

    // Update created attempt with final score/submission time
    await db
      .update(quizAttempts)
      .set({
        status: requiresManualReview ? "pending_review" : "graded",
        score: requiresManualReview ? null : String(score),
        submittedAt: new Date(),
        gradedAt: requiresManualReview ? null : new Date(),
        timeSpentSeconds: timeSpentSeconds || null,
      })
      .where(eq(quizAttempts.id, attemptId))

    await revalidateClassOrg(quizRow[0].classId, [
      "classes",
      `classes/${quizRow[0].classId}`,
      `classes/${quizRow[0].classId}/quizzes/${quizId}`,
      "home",
      "activity",
    ])

    await logActivity({
      actorId: session.user.id,
      eventType: "quiz_submitted",
      entityType: "quiz_attempt",
      entityId: attemptId,
      classId: quizRow[0].classId,
      title: `Submitted quiz "${quizRow[0].title}"`,
      description: requiresManualReview ? "Waiting for manual review" : `Scored ${score} points`,
    })

    return { success: true }
  } catch (err) {
    console.error("submitQuiz error", err)
    return { success: false, error: "Failed to submit quiz" }
  }
}

export async function gradeQuizAttempt(attemptId: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const raw = formData.get("grades") as string | null
  if (!raw) return { success: false, error: "Missing grades" }

  let payload: GradeQuizPayload
  try {
    payload = JSON.parse(raw) as GradeQuizPayload
  } catch {
    return { success: false, error: "Invalid grades payload" }
  }

  const attemptRows = await db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.id, attemptId))
    .limit(1)

  if (attemptRows.length === 0) {
    return { success: false, error: "Quiz attempt not found" }
  }

  const attempt = attemptRows[0]

  const quizRows = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, attempt.quizId))
    .limit(1)

  if (quizRows.length === 0) {
    return { success: false, error: "Quiz not found" }
  }

  const quiz = quizRows[0]

  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, quiz.classId),
        eq(classMembership.userId, session.user.id),
        eq(classMembership.role, "teacher"),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Only teachers can grade quiz attempts" }
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
  const questionMap = new Map(questions.map((question) => [question.id, question]))

  const answers = await db
    .select()
    .from(quizAnswers)
    .where(eq(quizAnswers.attemptId, attemptId))

  const shortAnswerAnswers = answers.filter((answer) => {
    const question = questionMap.get(answer.questionId)
    return question?.type === "short_answer"
  })

  if (shortAnswerAnswers.length === 0) {
    return { success: false, error: "This quiz attempt does not require manual grading" }
  }

  const gradeMap = new Map(payload.answers.map((answer) => [answer.answerId, answer.pointsAwarded]))

  for (const answer of shortAnswerAnswers) {
    if (!gradeMap.has(answer.id)) {
      return { success: false, error: "Each short-answer response needs a grade" }
    }
  }

  let totalScore = 0

  try {
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId)
      if (!question) continue

      if (question.type !== "short_answer") {
        totalScore += Number(answer.pointsAwarded || 0)
        continue
      }

      const awarded = Number(gradeMap.get(answer.id))
      const maxPoints = Number(question.points)

      if (!Number.isFinite(awarded) || awarded < 0 || awarded > maxPoints) {
        return {
          success: false,
          error: `Short-answer grades must be between 0 and ${maxPoints}`,
        }
      }

      totalScore += awarded

      await db
        .update(quizAnswers)
        .set({
          pointsAwarded: String(awarded),
        })
        .where(eq(quizAnswers.id, answer.id))
    }

    await db
      .update(quizAttempts)
      .set({
        status: "graded",
        score: String(totalScore),
        gradedAt: new Date(),
      })
      .where(eq(quizAttempts.id, attemptId))

    await revalidateClassOrg(quiz.classId, [
      "classes",
      `classes/${quiz.classId}`,
      `classes/${quiz.classId}/quizzes/${quiz.id}`,
      "home",
      "activity",
    ])

    await logActivity({
      actorId: session.user.id,
      eventType: "quiz_graded",
      entityType: "quiz_attempt",
      entityId: attemptId,
      classId: quiz.classId,
      title: `Finished grading "${quiz.title}"`,
      description: `Final score recorded: ${totalScore}`,
    })

    return { success: true }
  } catch (error) {
    console.error("gradeQuizAttempt error", error)
    return { success: false, error: "Failed to grade quiz attempt" }
  }
}

export async function deleteQuiz(
  quizId: string
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const quizData = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1)

  if (quizData.length === 0) {
    return { success: false, error: "Quiz not found" }
  }

  // Check if user is a teacher
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, quizData[0].classId),
        eq(classMembership.userId, session.user.id),
        eq(classMembership.role, "teacher"),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    return { success: false, error: "Only teachers can delete quizzes" }
  }

  try {
    await db.delete(quizzes).where(eq(quizzes.id, quizId))

    await revalidateClassOrg(quizData[0].classId, [`classes/${quizData[0].classId}`])
    return { success: true }
  } catch (err) {
    console.error("deleteQuiz error", err)
    return { success: false, error: "Failed to delete quiz" }
  }
}
