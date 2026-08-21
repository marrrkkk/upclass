import type { OrgRole } from "@/types/organization"

/** Legacy `member` maps to student for permission checks. */
export function normalizeOrgRole(role: OrgRole): OrgRole {
  return role === "member" ? "student" : role
}

export function canManageOrganization(role: OrgRole): boolean {
  return role === "owner" || role === "admin"
}

export function canTeach(role: OrgRole): boolean {
  const normalized = normalizeOrgRole(role)
  return normalized === "owner" || normalized === "admin" || normalized === "teacher"
}

export function canCreateClass(role: OrgRole): boolean {
  return canTeach(role)
}

/** Whether an org member may enroll in classes as a student via class codes. */
export function canJoinClassAsStudent(role: OrgRole): boolean {
  return role === "owner" || role === "admin" || role === "teacher" || role === "student" || role === "member"
}

/** Roles that should not be downgraded when joining via a class enrollment code. */
export function isPrivilegedOrgRole(role: OrgRole): boolean {
  return role === "owner" || role === "admin" || role === "teacher"
}

/** Teaching-capable org roles for AI and dashboard surfaces. */
export function orgRoleTeachesInOrg(role: OrgRole): boolean {
  return canTeach(role)
}

/** Student-facing org role for AI surfaces. */
export function orgRoleAsClassRole(role: OrgRole): "teacher" | "student" {
  return orgRoleTeachesInOrg(role) ? "teacher" : "student"
}
