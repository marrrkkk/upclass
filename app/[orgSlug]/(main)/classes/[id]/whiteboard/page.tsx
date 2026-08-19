import { Suspense } from "react"

import { WhiteboardSkeleton } from "@/components/skeletons"
import { PageContainer } from "@/components/ui/section"
import { WhiteboardData } from "./whiteboard-data"

export default function WhiteboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  return (
    <Suspense
      fallback={
        <PageContainer width="canvas">
          <WhiteboardSkeleton />
        </PageContainer>
      }
    >
      <WhiteboardData params={params} />
    </Suspense>
  )
}