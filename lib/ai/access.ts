/**
 * Surface + conversation authorization for the AI assistant.
 */
import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import { classes, classMembership, orgMembership, resources, studyCollections } from "@/db/schema"
import { getConversation } from "@/lib/ai/conversations"
import { orgRoleAsClassRole } from "@/lib/org-permissions"
import type { OrgRole } from "@/types/organization"
import type { AiConversationRow, AiSurface } from "@/lib/ai/types"

export type SurfaceAccessResult = {
  allowed: boolean
  role: "teacher" | "student"
  reason?: "class_not_found" | "not_a_member" | "org_mismatch"
}

/** Class membership role for a user, or null when not a member. */
export async function getClassMembershipRole(
  userId: string,
  classId: string,
): Promise<"teacher" | "student" | null> {
  const [membership] = await db
    .select({ role: classMembership.role })
    .from(classMembership)
    .where(and(eq(classMembership.classId, classId), eq(classMembership.userId, userId)))
    .limit(1)
  return membership?.role ?? null
}

/**
 * Resolve access + normalized role for a chat surface.
 *
 * - dashboard: any org member; owner/admin map to "teacher", members to "student".
 * - class: the class must belong to the org and the user must be a member
 *   (or the class owner).
 * - resource: the user must own the resource OR share an organization with
 *   the resource owner.
 */
export async function resolveAiSurfaceAccess(params: {
  userId: string
  orgId: string
  surface: AiSurface
  entityId: string
  orgRole: OrgRole
}): Promise<SurfaceAccessResult> {
  if (params.surface === "dashboard") {
    return {
      allowed: true,
      role: orgRoleAsClassRole(params.orgRole),
    }
  }

  if (params.surface === "resource") {
    // For resource surface, entityId is the resource ID
    const [resource] = await db
      .select({ id: resources.id, ownerId: resources.ownerId })
      .from(resources)
      .where(eq(resources.id, params.entityId))
      .limit(1)
    
    if (!resource) {
      return { allowed: false, role: "student", reason: "class_not_found" }
    }

    const hasAccess = await resolveResourceAccess(params.userId, resource)
    if (!hasAccess) {
      return { allowed: false, role: "student", reason: "not_a_member" }
    }

    return {
      allowed: true,
      role: orgRoleAsClassRole(params.orgRole),
    }
  }

  if (params.surface === "study") {
    const [space] = await db.select({ id: studyCollections.id, orgId: studyCollections.orgId, studentId: studyCollections.studentId }).from(studyCollections).where(eq(studyCollections.id, params.entityId)).limit(1)
    if (!space) return { allowed: false, role: "student", reason: "class_not_found" }
    if (space.orgId !== params.orgId) return { allowed: false, role: "student", reason: "org_mismatch" }
    if (space.studentId !== params.userId) return { allowed: false, role: "student", reason: "not_a_member" }
    return { allowed: true, role: "student" }
  }

  const [classRow] = await db
    .select({ id: classes.id, orgId: classes.orgId, ownerId: classes.ownerId })
    .from(classes)
    .where(eq(classes.id, params.entityId))
    .limit(1)

  if (!classRow) return { allowed: false, role: "student", reason: "class_not_found" }
  if (classRow.orgId !== params.orgId) {
    return { allowed: false, role: "student", reason: "org_mismatch" }
  }

  if (classRow.ownerId === params.userId) {
    return { allowed: true, role: "teacher" }
  }

  const membershipRole = await getClassMembershipRole(params.userId, params.entityId)
  if (!membershipRole) return { allowed: false, role: "student", reason: "not_a_member" }

  return { allowed: true, role: membershipRole }
}

/** Fetch a conversation and verify the user owns it. */
export async function getAuthorizedAiConversation(
  userId: string,
  conversationId: string,
): Promise<AiConversationRow | null> {
  const conversation = await getConversation(conversationId)
  if (!conversation) return null
  if (conversation.userId !== userId) return null
  return conversation
}

/** Verify a conversation matches the requested surface/entity. */
export function conversationMatchesSurface(
  conversation: AiConversationRow,
  surface: AiSurface,
  entityId: string,
): boolean {
  return conversation.surface === surface && conversation.entityId === entityId
}

/** Verify the org membership row exists (returns the org role). */
export async function getOrgRoleForUser(
  userId: string,
  orgId: string,
): Promise<OrgRole | null> {
  const [membership] = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(and(eq(orgMembership.orgId, orgId), eq(orgMembership.userId, userId)))
    .limit(1)
  return membership?.role ?? null
}

/**
 * Resolve access to a resource for the resource AI chat (5.3).
 *
 * Allowed when the requester owns the resource OR shares an organization
 * with the resource owner. Returns `false` for both not-found and
 * forbidden so callers can answer 404 without leaking existence.
 */
export async function resolveResourceAccess(
  userId: string,
  resource: { id: string; ownerId: string },
): Promise<boolean> {
  if (resource.ownerId === userId) return true

  const ownerOrgs = await db
    .select({ orgId: orgMembership.orgId })
    .from(orgMembership)
    .where(eq(orgMembership.userId, resource.ownerId))
  if (ownerOrgs.length === 0) return false

  const ownerOrgIds = ownerOrgs.map((row) => row.orgId)
  const shared = await db
    .select({ orgId: orgMembership.orgId })
    .from(orgMembership)
    .where(and(eq(orgMembership.userId, userId), inArray(orgMembership.orgId, ownerOrgIds)))
    .limit(1)
  return shared.length > 0
}
