import { redirect } from "next/navigation"

import { MessagesClient } from "@/components/messages/messages-client"
import { getOptionalSession } from "@/lib/server/auth"
import { getChannelSummaries, getConversationSummaries } from "@/lib/server/messages"

export async function MessagesData({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const [conversations, channels] = await Promise.all([
    getConversationSummaries(session.user.id, orgSlug),
    getChannelSummaries(session.user.id, orgSlug),
  ])

  const threads = [...conversations, ...channels].sort((left, right) => {
    const leftTime = left.lastMessageTime ? new Date(left.lastMessageTime).getTime() : 0
    const rightTime = right.lastMessageTime ? new Date(right.lastMessageTime).getTime() : 0
    return rightTime - leftTime
  })

  return (
    <MessagesClient
      threads={threads}
      userId={session.user.id}
      orgSlug={orgSlug}
      showHeader={false}
    />
  )
}
