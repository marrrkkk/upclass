import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, count, eq, gt, isNull, ne, or } from "drizzle-orm"

import { db } from "@/db"
import {
  channelMemberState,
  channelMessages,
  classChannels,
  classMembership,
  classes,
  directConversationMembers,
  directConversations,
  messages,
} from "@/db/schema"
import { auth } from "@/lib/auth"
import { getOrgIdForSlug } from "@/lib/server/messages"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orgSlug = request.nextUrl.searchParams.get("orgSlug")
  if (!orgSlug) return NextResponse.json({ error: "Organization is required" }, { status: 400 })
  const orgId = await getOrgIdForSlug(orgSlug)
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 })

  const [direct] = await db
    .select({ count: count() })
    .from(messages)
    .innerJoin(directConversations, eq(directConversations.id, messages.conversationId))
    .innerJoin(
      directConversationMembers,
      and(
        eq(directConversationMembers.conversationId, directConversations.id),
        eq(directConversationMembers.userId, session.user.id),
      ),
    )
    .where(
      and(
        eq(directConversations.orgId, orgId),
        eq(messages.receiverId, session.user.id),
        eq(messages.read, false),
      ),
    )

  const [channels] = await db
    .select({ count: count() })
    .from(channelMessages)
    .innerJoin(classChannels, eq(classChannels.id, channelMessages.channelId))
    .innerJoin(classes, eq(classes.id, classChannels.classId))
    .innerJoin(classMembership, eq(classMembership.classId, classChannels.classId))
    .leftJoin(
      channelMemberState,
      and(
        eq(channelMemberState.channelId, channelMessages.channelId),
        eq(channelMemberState.userId, session.user.id),
      ),
    )
    .where(
      and(
        eq(classes.orgId, orgId),
        eq(classMembership.userId, session.user.id),
        ne(channelMessages.senderId, session.user.id),
        or(
          isNull(channelMemberState.lastReadCreatedAt),
          gt(channelMessages.createdAt, channelMemberState.lastReadCreatedAt),
        ),
      ),
    )

  return NextResponse.json({ count: Number(direct?.count || 0) + Number(channels?.count || 0) })
}
