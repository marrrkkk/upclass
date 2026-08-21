import { z } from "zod"

export const studySpaceSchema = z.object({
  orgSlug: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
})

export const studyCardSchema = z.object({
  orgSlug: z.string().min(1),
  collectionId: z.string().uuid(),
  cardId: z.string().uuid().optional(),
  front: z.string().trim().min(1).max(500),
  back: z.string().trim().min(1).max(4000),
  hint: z.string().trim().max(1000).optional(),
  explanation: z.string().trim().max(4000).optional(),
})

export const studyQuizSchema = z.object({
  orgSlug: z.string().min(1),
  collectionId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
})

export const studyQuestionSchema = z.object({
  orgSlug: z.string().min(1),
  quizId: z.string().uuid(),
  questionId: z.string().uuid().optional(),
  prompt: z.string().trim().min(1).max(1000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
  correctAnswer: z.string().trim().min(1).max(500),
  explanation: z.string().trim().max(4000).optional(),
  position: z.number().int().min(0).optional(),
}).refine((value) => value.options.includes(value.correctAnswer), { message: "Correct answer must be one of the options", path: ["correctAnswer"] })
