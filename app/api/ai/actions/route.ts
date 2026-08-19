import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import { executeAiAction } from "@/lib/ai/tools/actions-executor"
import { isAiActionsEnabled } from "@/lib/ai/policy"
import { revalidateOrg } from "@/lib/server/revalidate"

export const maxDuration = 30

const actionBodySchema = z.object({
  orgSlug: z.string().min(1),
  action: z.enum([
    "create_announcement",
    "create_classwork",
    "create_quiz",
    "create_channel_message",
  ]),
  payload: z.record(z.string(), z.unknown()),
  /** Durable idempotency key issued by the action tool. */
  proposalId: z.string().uuid().optional(),
  /** Correlation id for usage/token/feedback logging. */
  runId: z.string().min(1).max(128).optional(),
})

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: NO_STORE })
  }

  const parsed = actionBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request body" },
      { status: 400, headers: NO_STORE },
    )
  }

  if (!isAiActionsEnabled()) {
    return NextResponse.json(
      { error: "AI actions are currently disabled" },
      { status: 403, headers: NO_STORE },
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

  const result = await executeAiAction(
    session.user.id,
    parsed.data.orgSlug,
    {
      action: parsed.data.action,
      payload: parsed.data.payload,
      proposalId: parsed.data.proposalId,
    },
    parsed.data.runId,
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400, headers: NO_STORE })
  }

  revalidateOrg(parsed.data.orgSlug, ["classes", "messages", "activity"])

  return NextResponse.json(
    {
      success: true,
      action: result.action,
      entityUrl: result.entityUrl,
      message: result.message,
    },
    { headers: NO_STORE },
  )
}