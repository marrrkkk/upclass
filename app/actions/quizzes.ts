"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
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

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

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

  if (!payload.title?.trim()) return { success: false, error: "Title is required" }
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    return { success: false, error: "At least one question is required" }
  }

  try {
    const quizId = crypto.randomUUID()
    const totalPoints = payload.questions.reduce((sum, q) => sum + (q.points || 0), 0)
    await db.insert(quizzes).values({
      id: quizId,
      classId,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      status: payload.status,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      timeLimitSeconds: payload.timeLimitSeconds != null ? String(payload.timeLimitSeconds) : null,
      totalPoints: String(totalPoints),
      createdBy: session.user.id,
    })

    for (const question of payload.questions) {
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

    revalidatePath(`/home/classes/${classId}`)
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

  if (!payload.title?.trim()) return { success: false, error: "Title is required" }
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    return { success: false, error: "At least one question is required" }
  }

  try {
    const totalPoints = payload.questions.reduce((sum, q) => sum + (q.points || 0), 0)

    // Update quiz
    await db.update(quizzes).set({
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      status: payload.status,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      timeLimitSeconds: payload.timeLimitSeconds != null ? String(payload.timeLimitSeconds) : null,
      totalPoints: String(totalPoints),
      updatedAt: new Date(),
    }).where(eq(quizzes.id, quizId))

    // Delete existing questions (cascade will delete options)
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId))

    // Insert new questions
    for (const question of payload.questions) {
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

    revalidatePath(`/home/classes/${classId}`)
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
      score: null,
      submittedAt: null,
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
        pointsAwarded: String(awarded),
      })
    }

    // Update created attempt with final score/submission time
    await db
      .update(quizAttempts)
      .set({
        score: String(score),
        submittedAt: new Date(),
        timeSpentSeconds: timeSpentSeconds || null,
      })
      .where(eq(quizAttempts.id, attemptId))

    revalidatePath(`/home/classes/${quizRow[0].classId}`)
    return { success: true }
  } catch (err) {
    console.error("submitQuiz error", err)
    return { success: false, error: "Failed to submit quiz" }
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

    revalidatePath(`/home/classes/${quizData[0].classId}`)
    return { success: true }
  } catch (err) {
    console.error("deleteQuiz error", err)
    return { success: false, error: "Failed to delete quiz" }
  }
}
