import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { getOrganizationMembership } from "@/lib/org-validation"
import { deleteConversation, getConversation } from "@/lib/ai/conversations"

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  }

  const conversation = await getConversation(conversationId)
  if (!conversation || conversation.userId !== session.user.id) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404, headers: NO_STORE })
  }

  return NextResponse.json({ conversation }, { headers: NO_STORE })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params

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

  await deleteConversation(conversationId)
  return NextResponse.json({ success: true }, { headers: NO_STORE })
}