import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { classes } from "@/db/schema"
import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import { getPulseFacts } from "@/lib/ai/pulse/facts"
import { isPulseEnabled } from "@/lib/ai/policy"

export const maxDuration = 30

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function GET(request: NextRequest) {
  const orgSlug = request.nextUrl.searchParams.get("orgSlug")
  if (!orgSlug) {
    return NextResponse.json({ error: "orgSlug is required" }, { status: 400, headers: NO_STORE })
  }

  if (!isPulseEnabled()) {
    return NextResponse.json({ error: "Pulse is currently disabled" }, { status: 403, headers: NO_STORE })
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  }

  const membership = await getOrganizationMembership(session.user.id, orgSlug)
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })
  }

  const ownedClass = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.orgId, membership.orgId), eq(classes.ownerId, session.user.id)))
    .limit(1)
  const role = ownedClass.length > 0 ? "teacher" : "student"

  const facts = await getPulseFacts({
    userId: session.user.id,
    orgId: membership.orgId,
    role,
  })

  return NextResponse.json(facts, { headers: NO_STORE })
}