import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import {
  createConversation,
  listDashboardConversations,
  listClassConversations,
  listResourceConversations,
  listStudyConversations,
} from "@/lib/ai/conversations"
import { resolveAiSurfaceAccess } from "@/lib/ai/access"
import type { AiSurface } from "@/lib/ai/types"

const listQuerySchema = z.object({
  orgSlug: z.string().min(1),
  surface: z.enum(["dashboard", "class", "resource", "study"]),
  classId: z.string().optional(),
  resourceId: z.string().optional(),
  studyId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const createBodySchema = z.object({
  orgSlug: z.string().min(1),
  surface: z.enum(["dashboard", "class", "resource", "study"]),
  entityId: z.string().min(1),
})

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function GET(request: NextRequest) {
  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400, headers: NO_STORE },
    )
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  }

  const membership = await getOrganizationMembership(session.user.id, parsed.data.orgSlug)
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })
  }

  const surface = parsed.data.surface as AiSurface
  const entityId = surface === "class"
    ? parsed.data.classId
    : surface === "resource"
      ? parsed.data.resourceId
      : surface === "study"
        ? parsed.data.studyId
        : "dashboard"
  if (surface !== "dashboard" && !entityId) {
    return NextResponse.json(
      { error: `${surface}Id is required` },
      { status: 400, headers: NO_STORE },
    )
  }
  const resolvedEntityId = entityId ?? "dashboard"

  const access = await resolveAiSurfaceAccess({
    userId: session.user.id,
    orgId: membership.orgId,
    surface,
    entityId: resolvedEntityId,
    orgRole: membership.role,
  })
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })
  }

  const conversations =
    surface === "class"
      ? await listClassConversations(session.user.id, membership.orgId, resolvedEntityId, parsed.data.limit)
      : surface === "resource"
        ? await listResourceConversations(session.user.id, membership.orgId, resolvedEntityId, parsed.data.limit)
        : surface === "study"
          ? await listStudyConversations(session.user.id, membership.orgId, resolvedEntityId, parsed.data.limit)
          : await listDashboardConversations(session.user.id, membership.orgId, parsed.data.limit)

  return NextResponse.json({ conversations }, { headers: NO_STORE })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: NO_STORE })
  }

  const parsed = createBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request body" },
      { status: 400, headers: NO_STORE },
    )
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  }

  const membership = await getOrganizationMembership(session.user.id, parsed.data.orgSlug)
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })
  }

  const access = await resolveAiSurfaceAccess({
    userId: session.user.id,
    orgId: membership.orgId,
    surface: parsed.data.surface,
    entityId: parsed.data.entityId,
    orgRole: membership.role,
  })
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })
  }

  const conversation = await createConversation({
    userId: session.user.id,
    orgId: membership.orgId,
    surface: parsed.data.surface,
    entityId: parsed.data.entityId,
  })

  return NextResponse.json({ conversation }, { status: 201, headers: NO_STORE })
}
