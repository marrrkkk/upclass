import type { Metadata } from "next"
import { Suspense } from "react"

import { GenericPageSkeleton } from "@/components/skeletons"
import { ChatConversationData } from "./chat-conversation-data"

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default function ChatConversationPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  return (
    <div className="-mx-4 h-[calc(100dvh-var(--app-header-height)-1rem-6rem)] sm:-mx-5 md:-mx-6 md:h-[calc(100dvh-var(--app-header-height)-1.25rem-1.75rem)]">
      <Suspense fallback={<GenericPageSkeleton />}>
        <ChatConversationData params={params} />
      </Suspense>
    </div>
  )
}