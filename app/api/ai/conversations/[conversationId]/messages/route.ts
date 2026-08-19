import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import { getConversation, listMessagesPage } from "@/lib/ai/conversations"

const NO_STORE = { "Cache-Control": "private, no-store" }

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  before: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params

  const parsed = querySchema.safeParse(
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

  const conversation = await getConversation(conversationId)
  if (!conversation || conversation.userId !== session.user.id) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404, headers: NO_STORE })
  }

  const membership = await getOrganizationMembership(session.user.id, conversation.orgId)
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })
  }

  try {
    const page = await listMessagesPage(conversationId, {
      limit: parsed.data.limit,
      before: parsed.data.before ?? null,
    })
    return NextResponse.json(page, { headers: NO_STORE })
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid cursor") {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400, headers: NO_STORE })
    }
    throw error
  }
}