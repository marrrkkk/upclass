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

export const gradeLevelEnum = z.enum([
  "kindergarten",
  "grade_1",
  "grade_2",
  "grade_3",
  "grade_4",
  "grade_5",
  "grade_6",
  "grade_7",
  "grade_8",
  "grade_9",
  "grade_10",
  "grade_11",
  "grade_12",
  "college",
  "other",
])

export const resourceTypeEnum = z.enum([
  "notes",
  "slides",
  "worksheet",
  "reading",
  "reference",
  "template",
  "other",
])

export const createClassSchema = z
  .object({
    title: requiredTrimmedString("Title").refine(
      (value) => value.length >= 2,
      "Title must be at least 2 characters"
    ).refine(
      (value) => value.length <= 80,
      "Title must be 80 characters or fewer"
    ),
    gradeLevel: gradeLevelEnum,
    customGrade: optionalTrimmedString.optional(),
    section: optionalTrimmedString
      .refine(
        (value) => value === undefined || value.length <= 40,
        "Section must be 40 characters or fewer"
      )
      .optional(),
    description: optionalTrimmedString
      .refine(
        (value) => value === undefined || value.length <= 500,
        "Description must be 500 characters or fewer"
      )
      .optional(),
    color: optionalTrimmedString.default("#0369a1"),
    schedule: optionalTrimmedString
      .refine(
        (value) => value === undefined || value.length <= 120,
        "Schedule must be 120 characters or fewer"
      )
      .nullish(),
  })
  .refine(
    (data) => {
      if (data.gradeLevel === "other") {
        return !!data.customGrade && data.customGrade.trim().length >= 2
      }
      return true
    },
    {
      message: "Custom grade must be at least 2 characters when grade level is Other",
      path: ["customGrade"],
    }
  )
  .refine(
    (data) => {
      if (data.gradeLevel === "other" && data.customGrade) {
        return data.customGrade.length <= 40
      }
      return true
    },
    {
      message: "Custom grade must be 40 characters or fewer",
      path: ["customGrade"],
    }
  )

export const joinClassSchema = z.object({
  code: requiredTrimmedString("Class code").transform((value) => value.toUpperCase()),
})

export const updateClassSchema = createClassSchema

export const createResourceSchema = z.object({
  title: requiredTrimmedString("Title").refine(
    (value) => value.length >= 2,
    "Title must be at least 2 characters"
  ).refine(
    (value) => value.length <= 160,
    "Title must be 160 characters or fewer"
  ),
  resourceType: resourceTypeEnum,
  classId: optionalTrimmedString.optional(),
  description: optionalTrimmedString
    .refine(
      (value) => value === undefined || value.length <= 500,
      "Description must be 500 characters or fewer"
    )
    .optional(),
  fileUrl: requiredTrimmedString("File URL"),
  fileName: requiredTrimmedString("File name"),
  fileType: requiredTrimmedString("File type"),
  fileSize: optionalTrimmedString.nullish(),
  storagePath: optionalTrimmedString.nullish(),
})

export const updateResourceSchema = z.object({
  id: requiredTrimmedString("Resource ID"),
  title: requiredTrimmedString("Title").refine(
    (value) => value.length >= 2,
    "Title must be at least 2 characters"
  ).refine(
    (value) => value.length <= 160,
    "Title must be 160 characters or fewer"
  ),
  resourceType: resourceTypeEnum,
  classId: optionalTrimmedString.optional(),
  description: optionalTrimmedString
    .refine(
      (value) => value === undefined || value.length <= 500,
      "Description must be 500 characters or fewer"
    )
    .optional(),
})

export const sendMessageSchema = z
  .object({
    orgSlug: requiredTrimmedString("Organization").optional(),
    receiverId: requiredTrimmedString("Receiver"),
    content: optionalTrimmedString.default("").pipe(z.string().max(4_000, "Message must be 4,000 characters or fewer")),
    media: optionalTrimmedString.nullish(),
    url: optionalTrimmedString.nullish(),
    clientMessageId: z.string().trim().min(1).max(64).optional(),
  })
  .refine((value) => value.content.length > 0 || !!value.media, {
    message: "Message must have content or media",
    path: ["content"],
  })

export const sendChannelMessageSchema = z
  .object({
    orgSlug: requiredTrimmedString("Organization").optional(),
    channelId: requiredTrimmedString("Channel"),
    content: optionalTrimmedString.default("").pipe(z.string().max(4_000, "Message must be 4,000 characters or fewer")),
    media: optionalTrimmedString.nullish(),
    clientMessageId: z.string().trim().min(1).max(64).optional(),
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

export const aiChatHistorySchema = z.object({
  resourceId: requiredTrimmedString("Resource ID"),
})

export const aiChatSchema = aiChatHistorySchema.extend({
  message: z
    .string()
    .max(4_000, "Message must be 4,000 characters or fewer")
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, "Message is required"),
  clientMessageId: z.string().trim().min(1).max(64).optional(),
})

export type CreateClassInput = z.infer<typeof createClassSchema>

export const aiQuizGenerationSchema = z
  .object({
    classId: requiredTrimmedString("Class ID"),
    instructions: z.string().trim().max(4_000, "Instructions must be 4,000 characters or fewer").optional().default(""),
    files: z
      .array(
        z.object({
          url: z.string().url("Reference file URL is invalid"),
          name: requiredTrimmedString("Reference file name").refine(
            (value) => value.length <= 255,
            "Reference file name is too long",
          ),
        }),
      )
      .max(5, "Upload up to five reference files")
      .default([]),
  })
  .refine((value) => value.instructions.length > 0 || value.files.length > 0, {
    message: "Add instructions or at least one reference file",
    path: ["instructions"],
  })

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

/* -------------------------------------------------------------------------- */
/*                               Organizations                                */
/* -------------------------------------------------------------------------- */

const emailAddress = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
  .refine((value) => value.length > 0, "Email address is required")
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email address")

/**
 * Organization slugs occupy the root URL namespace (`/[orgSlug]/…`), so they
 * must never shadow a real top-level route or a reserved product path.
 */
export const RESERVED_ORG_SLUGS = new Set([
  "api",
  "app",
  "admin",
  "onboard",
  "org",
  "sign-in",
  "sign-up",
  "sign-out",
  "auth",
  "login",
  "logout",
  "register",
  "contact",
  "privacy",
  "terms",
  "settings",
  "profile",
  "home",
  "classes",
  "resources",
  "messages",
  "notifications",
  "activity",
  "user",
  "help",
  "support",
  "about",
  "pricing",
  "blog",
  "docs",
  "static",
  "public",
  "assets",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
])

/** Lowercase, hyphen-separated URL segment used as the organization's namespace. */
export const orgSlugSchema = requiredTrimmedString("Organization URL")
  .transform((value) => value.toLowerCase())
  .refine((value) => value.length >= 3, "Organization URL must be at least 3 characters")
  .refine((value) => value.length <= 48, "Organization URL must be 48 characters or fewer")
  .refine(
    (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    "Use lowercase letters, numbers and single hyphens only",
  )
  .refine(
    (value) => !RESERVED_ORG_SLUGS.has(value),
    "That URL is reserved. Pick a different one",
  )

export const createOrganizationSchema = z.object({
  name: requiredTrimmedString("Organization name").refine(
    (value) => value.length <= 80,
    "Organization name must be 80 characters or fewer",
  ),
  slug: orgSlugSchema,
  description: optionalTrimmedString
    .refine(
      (value) => value === undefined || value.length <= 200,
      "Description must be 200 characters or fewer",
    )
    .optional(),
})

export const joinOrganizationSchema = z.object({
  token: requiredTrimmedString("Invite code"),
})

export const createInvitationSchema = z.object({
  orgId: requiredTrimmedString("Organization"),
  email: emailAddress,
  role: z.enum(["admin", "teacher", "student"]).default("student"),
})

export const updateMemberRoleSchema = z.object({
  orgId: requiredTrimmedString("Organization"),
  userId: requiredTrimmedString("Member"),
  role: z.enum(["admin", "teacher", "student"]),
})

export const joinByClassCodeSchema = z.object({
  code: requiredTrimmedString("Class code")
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z0-9]{6}$/.test(value), "Enter a valid 6-character class code"),
})

export const accountSetupSchema = z.object({
  name: requiredTrimmedString("Display name").refine(
    (value) => value.trim().length >= 2,
    "Use at least 2 characters",
  ),
})

export const removeMemberSchema = z.object({
  orgId: requiredTrimmedString("Organization"),
  userId: requiredTrimmedString("Member"),
})

export const revokeInvitationSchema = z.object({
  orgId: requiredTrimmedString("Organization"),
  invitationId: requiredTrimmedString("Invitation"),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type JoinOrganizationInput = z.infer<typeof joinOrganizationSchema>
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>
export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>
