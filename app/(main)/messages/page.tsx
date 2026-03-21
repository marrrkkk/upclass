import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"

import { MessagesContentSkeleton } from "@/components/skeletons"
import { MessagesClient } from "@/components/messages/messages-client"
import { getOptionalSession } from "@/lib/server/auth"
import { getConversationSummaries } from "@/lib/server/messages"

export const metadata: Metadata = {
  title: "Messages",
}

export default async function MessagesPage() {
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="mt-1 text-muted-foreground">
          Connect with your classmates and teachers.
        </p>
      </div>

      <Suspense fallback={<MessagesContentSkeleton />}>
        <MessagesPageContent userId={session.user.id} />
      </Suspense>
    </section>
  )
}

async function MessagesPageContent({ userId }: { userId: string }) {
  const conversations = await getConversationSummaries(userId)

  return <MessagesClient conversations={conversations} userId={userId} showHeader={false} />
}
