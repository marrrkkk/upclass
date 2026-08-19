import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { desc, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelMessages, user } from "@/db/schema"
import { ClassChannelChatClient } from "@/components/messages/class-channel-chat-client"
import { getAccessibleChannelForClass } from "@/lib/server/messages"

export async function ClassChannelData({
  params,
}: {
  params: Promise<{ orgSlug: string; classId: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const { orgSlug, classId } = await params
  const channel = await getAccessibleChannelForClass(session.user.id, classId)

  if (!channel) {
    redirect(`/${orgSlug}/messages`)
  }

  const messagesList = await db
    .select({
      id: channelMessages.id,
      senderId: channelMessages.senderId,
      content: channelMessages.content,
      media: channelMessages.media,
      createdAt: channelMessages.createdAt,
      sender: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(channelMessages)
    .innerJoin(user, eq(channelMessages.senderId, user.id))
    .where(eq(channelMessages.channelId, channel.id))
    .orderBy(desc(channelMessages.createdAt), desc(channelMessages.id))
    .limit(51)

  const hasMore = messagesList.length > 50

  return (
    <ClassChannelChatClient
      channelId={channel.id}
      className={channel.className}
      classColor={channel.classColor || channel.className}
      currentUserId={session.user.id}
      messages={messagesList.slice(0, 50).reverse().map((message) => ({
        ...message,
        createdAt: message.createdAt?.toISOString() ?? "",
        media: message.media ? JSON.parse(message.media) : null,
      }))}
      orgSlug={orgSlug}
      hasMore={hasMore}
    />
  )
}
