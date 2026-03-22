import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { asc, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { channelMessages, user } from "@/db/schema"
import { ClassChannelChatClient } from "@/components/messages/class-channel-chat-client"
import { getAccessibleChannelForClass } from "@/lib/server/messages"

export default async function ClassChannelPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const { classId } = await params
  const channel = await getAccessibleChannelForClass(session.user.id, classId)

  if (!channel) {
    redirect("/messages")
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
    .orderBy(asc(channelMessages.createdAt))
    .limit(150)

  return (
    <ClassChannelChatClient
      channelId={channel.id}
      className={channel.className}
      classColor={channel.classColor || "#3b82f6"}
      currentUserId={session.user.id}
      messages={messagesList.map((message) => ({
        ...message,
        createdAt: message.createdAt?.toISOString() ?? "",
        media: message.media ? JSON.parse(message.media) : null,
      }))}
    />
  )
}
