import { Suspense } from "react"

import { MessagesDetailSkeleton } from "@/components/skeletons"
import { PageContainer } from "@/components/ui/section"
import { ClassChannelData } from "./class-channel-data"

export default function ClassChannelPage({
  params,
}: {
  params: Promise<{ orgSlug: string; classId: string }>
}) {
  return (
    <PageContainer width="wide">
      <Suspense fallback={<MessagesDetailSkeleton variant="channel" />}>
        <ClassChannelData params={params} />
      </Suspense>
    </PageContainer>
  )
}