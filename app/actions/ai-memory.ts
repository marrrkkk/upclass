"use server"

/**
 * Server actions for org knowledge base management (admin-only UI).
 */
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import {
  createOrgMemory,
  deleteOrgMemory,
  listOrgMemories,
  requireMemoryAdminRole,
  updateOrgMemory,
  type CreateOrgMemoryInput,
} from "@/lib/ai/memory/memory-actions"
import { revalidateOrg } from "@/lib/server/revalidate"
import type { AiMemoryCategory } from "@/lib/ai/types"

export type AiMemoryActionResponse =
  | { success: true; memory?: unknown }
  | { success: false; error: string }

async function requireMemoryAdmin(
  orgSlug: string,
): Promise<{ userId: string; orgId: string; role: "owner" | "admin" } | { error: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return { error: "Unauthorized" }

  const membership = await getOrganizationMembership(session.user.id, orgSlug)
  if (!membership) return { error: "You do not have access to this organization" }

  const role = await requireMemoryAdminRole(session.user.id, membership.orgId)
  if (!role) return { error: "Only owners and admins can manage the knowledge base" }

  return { userId: session.user.id, orgId: membership.orgId, role }
}

export async function listOrgMemoriesAction(orgSlug: string): Promise<AiMemoryActionResponse> {
  const user = await requireMemoryAdmin(orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  const memories = await listOrgMemories(user.orgId)
  return { success: true, memory: memories }
}

export async function createOrgMemoryAction(
  orgSlug: string,
  input: { title: string; content: string; category: AiMemoryCategory },
): Promise<AiMemoryActionResponse> {
  const user = await requireMemoryAdmin(orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  const payload: CreateOrgMemoryInput = {
    orgId: user.orgId,
    title: input.title,
    content: input.content,
    category: input.category,
  }
  const result = await createOrgMemory(payload)
  if (!result.ok) {
    const messages: Record<string, string> = {
      limit_reached: "The knowledge base limit has been reached (50 entries).",
      invalid_content: "The entry contains blocked content or is empty.",
    }
    return { success: false, error: messages[result.error] ?? "Failed to create the entry" }
  }

  revalidateOrg(orgSlug, ["chat"])
  return { success: true, memory: result.memory }
}

export async function updateOrgMemoryAction(
  orgSlug: string,
  memoryId: string,
  input: { title?: string; content?: string; category?: AiMemoryCategory },
): Promise<AiMemoryActionResponse> {
  const user = await requireMemoryAdmin(orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  const result = await updateOrgMemory(memoryId, user.orgId, input)
  if (!result.ok) {
    return {
      success: false,
      error: result.error === "not_found" ? "Entry not found" : "Failed to update the entry",
    }
  }

  revalidateOrg(orgSlug, ["chat"])
  return { success: true, memory: result.memory }
}

export async function deleteOrgMemoryAction(
  orgSlug: string,
  memoryId: string,
): Promise<AiMemoryActionResponse> {
  const user = await requireMemoryAdmin(orgSlug)
  if ("error" in user) return { success: false, error: user.error }

  const result = await deleteOrgMemory(memoryId, user.orgId)
  if (!result.ok) {
    return { success: false, error: "Entry not found" }
  }

  revalidateOrg(orgSlug, ["chat"])
  return { success: true }
}