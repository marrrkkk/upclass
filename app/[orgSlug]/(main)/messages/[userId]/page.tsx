import { Suspense } from "react"

import { MessagesDetailSkeleton } from "@/components/skeletons"
import { PageContainer } from "@/components/ui/section"
import { MessageChatData } from "./message-chat-data"

export default function ChatPage({ params }: { params: Promise<{ orgSlug: string; userId: string }> }) {
  return (
    <PageContainer width="wide">
      <Suspense fallback={<MessagesDetailSkeleton />}>
        <MessageChatData params={params} />
      </Suspense>
    </PageContainer>
  )
}