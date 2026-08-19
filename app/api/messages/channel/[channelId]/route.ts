import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import {
  decodeMessageCursor,
  getChannelMessagePage,
} from "@/lib/server/messages"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channelId } = await params
  const query = request.nextUrl.searchParams
  const cursor = decodeMessageCursor(query.get("before"))
  const limit = Number(query.get("limit") || 50)

  try {
    const page = await getChannelMessagePage(channelId, session.user.id, cursor, limit)
    return NextResponse.json({
      ...page,
      messages: page.messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
        media: message.media ? JSON.parse(message.media) : null,
      })),
    })
  } catch (error) {
    console.error("channel message page error", error)
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }
}
