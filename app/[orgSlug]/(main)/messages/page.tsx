import type { Metadata } from "next"
import { Suspense } from "react"

import { MessagesHeader } from "@/components/messages/messages-header"
import { MessagesContentSkeleton } from "@/components/skeletons"
import { PageContainer } from "@/components/ui/section"
import { MessagesData } from "./messages-data"

export const metadata: Metadata = {
  title: "Messages",
}

export default function MessagesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  return (
    <PageContainer width="wide">
      <MessagesHeader />

      <Suspense fallback={<MessagesContentSkeleton />}>
        <MessagesData params={params} />
      </Suspense>
    </PageContainer>
  )
}