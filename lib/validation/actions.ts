import { z } from "zod"

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  })

const requiredTrimmedString = (fieldName: string) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .refine((value) => value.length > 0, `${fieldName} is required`)

export const createClassSchema = z.object({
  title: requiredTrimmedString("Title"),
  description: optionalTrimmedString.optional(),
  category: optionalTrimmedString.default("General"),
  color: optionalTrimmedString.default("#3b82f6"),
  schedule: optionalTrimmedString.nullish(),
})

export const joinClassSchema = z.object({
  code: requiredTrimmedString("Class code").transform((value) => value.toUpperCase()),
})

export const updateClassSchema = createClassSchema

export const createResourceSchema = z.object({
  title: requiredTrimmedString("Title"),
  description: optionalTrimmedString.optional(),
  category: optionalTrimmedString.default("General"),
  fileUrl: requiredTrimmedString("File URL"),
  fileName: requiredTrimmedString("File name"),
  fileType: requiredTrimmedString("File type"),
  fileSize: optionalTrimmedString.nullish(),
})

export const updateResourceSchema = z.object({
  id: requiredTrimmedString("Resource ID"),
  title: requiredTrimmedString("Title"),
  description: optionalTrimmedString.optional(),
  category: optionalTrimmedString.default("General"),
})

export const sendMessageSchema = z
  .object({
    receiverId: requiredTrimmedString("Receiver"),
    content: optionalTrimmedString.default(""),
    media: optionalTrimmedString.nullish(),
    url: optionalTrimmedString.nullish(),
  })
  .refine((value) => value.content.length > 0 || !!value.media, {
    message: "Message must have content or media",
    path: ["content"],
  })

export const sendChannelMessageSchema = z
  .object({
    channelId: requiredTrimmedString("Channel"),
    content: optionalTrimmedString.default(""),
    media: optionalTrimmedString.nullish(),
  })
  .refine((value) => value.content.length > 0 || !!value.media, {
    message: "Message must have content or media",
    path: ["content"],
  })

export const submissionAttachmentSchema = z.object({
  fileUrl: requiredTrimmedString("Attachment URL"),
  fileName: requiredTrimmedString("Attachment name"),
  fileType: optionalTrimmedString.nullish(),
  fileSize: optionalTrimmedString.nullish(),
})

export const upsertSubmissionSchema = z
  .object({
    classworkId: requiredTrimmedString("Classwork"),
    content: optionalTrimmedString.default(""),
    attachments: z.array(submissionAttachmentSchema).default([]),
    mode: z.enum(["draft", "submit"]).default("submit"),
  })
  .refine((value) => value.content.length > 0 || value.attachments.length > 0, {
    message: "Content or attachment is required",
    path: ["content"],
  })

export const gradeSubmissionSchema = z.object({
  submissionId: requiredTrimmedString("Submission"),
  grade: requiredTrimmedString("Grade"),
  feedback: optionalTrimmedString.nullish(),
})

export const messageSearchSchema = z.object({
  query: optionalTrimmedString.default(""),
})

export const markMessageAsReadSchema = z.object({
  messageId: requiredTrimmedString("Message ID"),
})

export const markConversationAsReadSchema = z.object({
  otherUserId: requiredTrimmedString("User"),
})

export const aiChatSchema = z.object({
  message: requiredTrimmedString("Message"),
  resourceContext: z.object({
    title: requiredTrimmedString("Resource title"),
    description: optionalTrimmedString.nullish(),
    category: optionalTrimmedString.nullish(),
    fileType: requiredTrimmedString("File type"),
    fileName: requiredTrimmedString("File name"),
  }),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: requiredTrimmedString("Message"),
      }),
    )
    .optional()
    .default([]),
})

export type CreateClassInput = z.infer<typeof createClassSchema>
export type JoinClassInput = z.infer<typeof joinClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
export type CreateResourceInput = z.infer<typeof createResourceSchema>
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type SendChannelMessageInput = z.infer<typeof sendChannelMessageSchema>
export type UpsertSubmissionInput = z.infer<typeof upsertSubmissionSchema>
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>
export type MessageSearchInput = z.infer<typeof messageSearchSchema>
export type AIChatInput = z.infer<typeof aiChatSchema>
