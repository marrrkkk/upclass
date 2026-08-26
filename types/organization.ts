/**
 * Shared organization domain types.
 *
 * These previously lived inline in three different places (the onboarding
 * client, the Zustand store and the admin client) and drifted apart. Import from
 * here instead of redeclaring them.
 */

import type { Tone } from "@/lib/design-system"

/** Mirrors the `org_role` Postgres enum in `db/schema.ts`. */
export type OrgRole = "owner" | "admin" | "member" | "teacher" | "student"

/** Roles that can be assigned through the admin console (not owner). */
export type AssignableOrgRole = Exclude<OrgRole, "owner" | "member">

/** Roles assignable through organization email invitations. */
export type InvitableOrgRole = "admin" | "teacher" | "student"

/** An organization as it appears in a workspace list or switcher. */
export type OrganizationSummary = {
  id: string
  name: string
  slug: string
  description?: string | null
  logo?: string | null
  cover?: string | null
  role: OrgRole
  memberCount: number
}

export type OrganizationMember = {
  id: string
  name: string
  email: string
  image?: string | null
  role: OrgRole
  joinedAt?: Date | string | null
}

export type OrganizationClass = {
  id: string
  title: string
  code: string
  color?: string | null
  ownerName: string
  memberCount?: number
}

export type OrganizationInvitation = {
  id: string
  email: string
  role: OrgRole
  token: string
  expiresAt: Date | string
  createdAt: Date | string
  invitedByName: string | null
}

/** Human-readable copy for each role, used in tables, menus and badges. */
export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  member: "Student",
}

/** Plural forms, kept explicit so metric labels never read "Staffs". */
export const ORG_ROLE_LABELS_PLURAL: Record<OrgRole, string> = {
  owner: "Owners",
  admin: "Admins",
  teacher: "Teachers",
  student: "Students",
  member: "Students",
}

/** What each role can actually do, surfaced as help text next to role pickers. */
export const ORG_ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: "Full control, including billing, roles and deleting the organization",
  admin: "Manages the organization, invites staff, and can teach classes",
  teacher: "Creates and runs classes, invites students, manages resources",
  student: "Joins classes, submits work and takes part in discussions",
  member: "Joins classes, submits work and takes part in discussions",
}

/** Semantic tone per role so role colour is consistent across every surface. */
export const ORG_ROLE_TONES: Record<OrgRole, Tone> = {
  owner: "primary",
  admin: "info",
  teacher: "info",
  student: "neutral",
  member: "neutral",
}
