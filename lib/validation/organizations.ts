import { z } from "zod"

// Organization name: 2-100 chars, letters/numbers/spaces/hyphens/ampersands/apostrophes
export const orgNameSchema = z
  .string()
  .min(2, "Organization name must be at least 2 characters")
  .max(100, "Organization name must be at most 100 characters")
  .regex(
    /^[a-zA-Z0-9\s\-&']+$/,
    "Organization name can only contain letters, numbers, spaces, hyphens, ampersands, and apostrophes"
  )

// Organization description: up to 500 chars, optional
export const orgDescriptionSchema = z
  .string()
  .max(500, "Description must be at most 500 characters")
  .optional()

// Org roles
export const orgRoleSchema = z.enum(["admin", "teacher", "student"])

// Invitation creation
export const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: orgRoleSchema,
})

// Bulk enrollment: 1-200 student IDs
export const bulkEnrollSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  studentIds: z
    .array(z.string().min(1, "Student ID is required"))
    .min(1, "At least one student is required")
    .max(200, "Cannot enroll more than 200 students at once"),
})

// Class creation within org
export const createOrgClassSchema = z.object({
  title: z
    .string()
    .min(2, "Class title must be at least 2 characters")
    .max(100, "Class title must be at most 100 characters"),
  description: z.string().optional(),
  category: z.string().optional(),
})

// Organization settings update
export const updateOrgSettingsSchema = z.object({
  name: orgNameSchema,
  description: orgDescriptionSchema,
  logo: z.string().url("Invalid logo URL").optional(),
})

// Inferred types
export type OrgRole = z.infer<typeof orgRoleSchema>
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>
export type BulkEnrollInput = z.infer<typeof bulkEnrollSchema>
export type CreateOrgClassInput = z.infer<typeof createOrgClassSchema>
export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>
