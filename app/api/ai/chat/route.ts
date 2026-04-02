import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { askResourceQuestion, getLatestResourceChatSession } from "@/lib/resources/chat"
import {
  resourceAiChatSchema,
  resourceAiChatSessionQuerySchema,
} from "@/lib/validation/actions"

function getErrorStatus(message: string) {
  if (/unauthorized/i.test(message)) return 401
  if (/access/i.test(message)) return 403
  if (/not found/i.test(message)) return 404
  if (/not ready/i.test(message)) return 409
  return 400
}

async function getCurrentUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return session?.user?.id ?? null
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = resourceAiChatSessionQuerySchema.safeParse({
    classId: request.nextUrl.searchParams.get("classId"),
    resourceId: request.nextUrl.searchParams.get("resourceId"),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400 },
    )
  }

  try {
    const data = await getLatestResourceChatSession({
      userId,
      classId: parsed.data.classId,
      resourceId: parsed.data.resourceId,
    })

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chat history"
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = resourceAiChatSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request body" },
      { status: 400 },
    )
  }

  try {
    const data = await askResourceQuestion({
      userId,
      classId: parsed.data.classId,
      resourceId: parsed.data.resourceId,
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
    })

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get AI response"
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) })
  }
}
