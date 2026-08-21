import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { classes } from "@/db/schema"
import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import { getPulseFacts } from "@/lib/ai/pulse/facts"
import { generatePulseBriefing } from "@/lib/ai/pulse/briefing"
import { isPulseEnabled } from "@/lib/ai/policy"

export const maxDuration = 30

const briefingBodySchema = z.object({
  orgSlug: z.string().min(1),
})

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: NO_STORE })
  }

  const parsed = briefingBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: NO_STORE })
  }

  if (!isPulseEnabled()) {
    return NextResponse.json({ error: "Pulse is currently disabled" }, { status: 403, headers: NO_STORE })
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  }

  const membership = await getOrganizationMembership(session.user.id, parsed.data.orgSlug)
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

  if (facts.facts.length === 0 && !facts.nearestDeadline) {
    return NextResponse.json({ briefing: "" }, { headers: NO_STORE })
  }

  const result = await generatePulseBriefing({
    userId: session.user.id,
    orgId: membership.orgId,
    role,
    facts,
    runId: crypto.randomUUID(),
  })

  if (!result) {
    return NextResponse.json(
      { error: "Could not generate the daily briefing. Please try again." },
      { status: 502, headers: NO_STORE },
    )
  }

  return NextResponse.json({ briefing: result.briefing, modelId: result.modelId }, { headers: NO_STORE })
}